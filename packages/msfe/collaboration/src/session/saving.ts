import { encodeStateAsUpdate, type Doc } from "yjs";
import { cancellable, requestSignal } from "./request";
import type { SessionState } from "./state";
import type { CollaborationCheckpoint, CollaborationManifest, CollaborationProvider, CollaborationReceipt } from "./types";
import { v4 as uuidv4 } from "uuid";

/** Serializes explicit durable checkpoints without adding full-document reads to input. */
export class SessionSaving {
  version = 0;
  persisted = 0;
  private inFlight: Promise<CollaborationReceipt> | undefined;
  private retry: { request: CollaborationCheckpoint; version: number } | undefined;

  /** @param document - Session CRDT identity. @param state - Observable durability. @param lifetime - Disposal signal. */
  constructor(private readonly document: Doc, private readonly state: SessionState, private readonly lifetime: AbortSignal) {}

  /** Records an accepted local mutation, including delete-only and history updates. */
  changed(): void {
    this.version++;
    if (this.state.value.durability !== "unsupported" && this.state.value.durability !== "saving") this.state.update({ durability: "dirty" });
  }

  /** @param manifest - Current admission. @param provider - Driver with an explicit durable API. @param signal - Host cancellation. @returns Post-commit receipt for the captured version. */
  save(manifest: CollaborationManifest, provider: CollaborationProvider, signal?: AbortSignal): Promise<CollaborationReceipt> {
    if (this.inFlight) return this.inFlight;
    if (!provider.saveCheckpoint) return Promise.reject(new Error("collaboration-durability-unsupported"));
    const captured = this.retry ?? { request: { documentId: manifest.documentId, epoch: manifest.epoch,
      requestId: uuidv4(), update: encodeStateAsUpdate(this.document) }, version: this.version };
    this.retry = captured;
    this.state.update({ durability: "saving" });
    this.inFlight = this.send(provider, captured, requestSignal(this.lifetime, signal)).finally(() => { this.inFlight = undefined; });
    return this.inFlight;
  }

  /** @param provider - Durable driver. @param captured - Idempotent snapshot. @param signal - Bounded cancellation. @returns Validated receipt. */
  private async send(provider: CollaborationProvider, captured: { request: CollaborationCheckpoint; version: number }, signal: AbortSignal): Promise<CollaborationReceipt> {
    try {
      signal.throwIfAborted();
      const receipt = await cancellable(provider.saveCheckpoint!({ ...captured.request, update: captured.request.update.slice() }, signal), signal);
      signal.throwIfAborted();
      if (receipt.documentId !== captured.request.documentId || receipt.epoch !== captured.request.epoch
        || receipt.requestId !== captured.request.requestId || typeof receipt.revision !== "string" || !receipt.revision) throw new Error("collaboration-invalid-receipt");
      if (!["ready"].includes(this.state.value.lifecycle)) throw new Error("collaboration-stale-receipt");
      this.persisted = captured.version; this.retry = undefined;
      this.state.update({ durability: this.version === this.persisted ? "persisted" : "dirty", error: undefined });
      return receipt;
    } catch (error) {
      if (this.state.value.lifecycle !== "closed") this.state.update({ durability: "error", error });
      throw error;
    }
  }
}
