import { Doc, encodeStateAsUpdate, type Transaction } from "yjs";
import type { Text as SourceText } from "@quirekit/cm-state";
import type { MsfeSourceLease, MsfeSourceProvider } from "@quirekit/msfe-core/source-provider";
import { CollaborationHistory } from "../history/controller";
import { SourceLease } from "../binding/lease";
import { validateDocument, validateManifest } from "./validation";
import { SessionState } from "./state";
import { SessionSaving } from "./saving";
import { SessionNotifications } from "./notifications";
import { cancellable, requestSignal } from "./request";
import type { CollaborationPresenceTransport } from "../transport/types";
import type { AdoptCollaborationOptions, CollaborationCloseOptions, CollaborationManifest, CollaborationOptions,
  CollaborationProvider, CollaborationReceipt, CollaborationRecovery, CollaborationRequestOptions, CollaborationState, CollaborationTransportState } from "./types";

/** Host-owned collaboration identity. Destroying an editor only releases its lease on this object. */
export class CollaborationSession implements MsfeSourceProvider {
  readonly document: Doc;
  private readonly store = new SessionState();
  private readonly lifetime = new AbortController();
  private readonly origin = Object.freeze({ source: "msfe-local" });
  private readonly untrackedOrigin = Object.freeze({ source: "msfe-host" });
  private readonly saving: SessionSaving;
  private readonly notifications: SessionNotifications;
  private admitted: CollaborationManifest | undefined;
  private provider: CollaborationProvider | undefined;
  private history: CollaborationHistory | undefined;
  private lease: SourceLease | undefined;
  private acceptedSource: SourceText | undefined;
  private updateVersion = 0;
  private generation = 0;
  private preparing: Promise<void> | undefined;
  private connecting: AbortController | undefined;
  private closing = false;

  /** @param options - Connection factory or explicitly borrowed prepared document. */
  constructor(private readonly options: CollaborationOptions | AdoptCollaborationOptions) {
    this.document = "document" in options ? options.document : new Doc();
    this.saving = new SessionSaving(this.document, this.store, this.lifetime.signal);
    if ("manifest" in options) {
      validateManifest(options.manifest, options.manifest.documentId);
      validateDocument(this.document); this.admitted = Object.freeze({ ...options.manifest, sourceFormat: Object.freeze({ ...options.manifest.sourceFormat }) });
    }
    this.notifications = new SessionNotifications(this.document);
    if (this.admitted) {
      this.initializeHistory(); this.store.update({ lifecycle: "ready", permission: this.admitted.permission });
    }
    this.document.on("update", this.updated);
  }

  /** @returns Immutable current status; connected does not imply persisted. */
  get state(): CollaborationState { return this.store.value; }

  /** @returns Validated admission (identity, epoch, format), or null before preparation; live permission is in `state`. */
  get manifest(): CollaborationManifest | null { return this.admitted ?? null; }

  /** @param listener - Session state observer. @returns Unsubscribe function. */
  subscribe(listener: (state: CollaborationState) => void): () => void { return this.store.subscribe(listener); }

  /** @returns A provider-owned ephemeral lease; source-only and adopted sessions may not support it. */
  acquirePresence(): CollaborationPresenceTransport {
    if (this.state.lifecycle !== "ready" || this.state.connection !== "connected" || this.closing) throw new Error("collaboration-presence-unavailable");
    if (!this.provider?.acquirePresence) throw new Error("collaboration-presence-unsupported");
    return this.provider.acquirePresence();
  }

  /**
   * Sends a text message to server-side extensions over the live connection; nothing is queued while offline.
   * @param payload - Message text, e.g. an encoded activity hint.
   * @returns Whether a connected provider accepted it.
   */
  sendStateless(payload: string): boolean {
    if (this.state.connection !== "connected" || this.closing || !this.provider?.sendStateless) return false;
    return this.provider.sendStateless(payload);
  }

  /** @param options - Cancellation for initial admission or same-epoch reconnection. @returns Completion once source is ready to mount. */
  prepare(options: CollaborationRequestOptions = {}): Promise<void> {
    if (this.preparing) return this.preparing;
    if (["closed", "faulted", "recovery"].includes(this.state.lifecycle) || this.closing) return Promise.reject(new Error("collaboration-session-unavailable"));
    if (!("provider" in this.options) || this.state.connection === "connected") return Promise.resolve();
    this.preparing = this.connect(options).finally(() => { this.preparing = undefined; });
    return this.preparing;
  }

  /** Pauses networking while retaining all source and local history. */
  disconnect(): void {
    this.connecting?.abort(new Error("collaboration-disconnected"));
    this.generation++; this.provider?.disconnect();
    if (this.state.lifecycle === "preparing") this.store.update({ lifecycle: "failed" });
    if (this.state.lifecycle !== "closed") this.report({ connection: "disconnected", synced: false });
  }

  /** @returns A single editor lease; prepared content is captured at acquisition, never at prepare completion. */
  acquire(): MsfeSourceLease {
    if (this.state.lifecycle !== "ready" || !this.admitted || this.closing) throw new Error("collaboration-session-not-ready");
    if (this.lease) throw new Error("collaboration-already-bound");
    const text = validateDocument(this.document);
    this.lease = new SourceLease({ document: this.document, text, manifest: this.admitted, history: this.history!,
      origin: this.origin, untrackedOrigin: this.untrackedOrigin, writable: () => this.writable(), version: () => this.updateVersion,
      accepted: value => { this.acceptedSource = value; }, publish: notify => this.notifications.publish(notify),
      fault: error => this.fault(error), released: () => { this.lease = undefined; } });
    return this.lease;
  }

  /** @param options - Cancellable durable checkpoint. @returns Validated post-commit receipt. */
  save(options: CollaborationRequestOptions = {}): Promise<CollaborationReceipt> {
    if (this.state.lifecycle !== "ready" || !this.admitted) return Promise.reject(new Error("collaboration-session-not-ready"));
    if (this.state.permission !== "write") return Promise.reject(new Error("collaboration-readonly"));
    if (!this.provider) return Promise.reject(new Error("collaboration-durability-unsupported"));
    try { validateDocument(this.document); } catch (error) { this.fault(error); return Promise.reject(error); }
    return this.saving.save(this.admitted, this.provider, options.signal);
  }

  /** @returns Explicit recovery material; serializes source only at this host boundary. */
  checkpoint(): CollaborationRecovery {
    if (!this.admitted || this.state.lifecycle === "closed") throw new Error("collaboration-session-unavailable");
    const accepted = this.state.lifecycle === "faulted" ? this.acceptedSource : this.lease ? this.acceptedSource : undefined;
    return { manifest: { ...this.admitted, permission: this.state.permission }, update: encodeStateAsUpdate(this.document),
      source: accepted?.toString() ?? this.document.getText("source").toString(), state: this.state };
  }

  /** @param options - Explicit persistence, recovery or discard policy after editor unmount. @returns Completion after safe resource release. */
  async close(options: CollaborationCloseOptions): Promise<void> {
    if (this.state.lifecycle === "closed") return;
    if (this.lease || this.closing || this.preparing) throw new Error("collaboration-session-busy");
    this.closing = true;
    const version = this.saving.version;
    try {
      if (options.mode === "persist") {
        if (this.state.lifecycle !== "ready") throw new Error("collaboration-session-not-ready");
        if (!this.provider?.saveCheckpoint) throw new Error("collaboration-durability-unsupported");
        if (this.saving.version !== this.saving.persisted) await this.save({ ...(options.signal ? { signal: options.signal } : {}) });
      } else if (options.mode === "checkpoint") await options.persistRecovery(this.checkpoint());
      if (version !== this.saving.version && options.mode !== "discard") throw new Error("collaboration-close-raced");
      if (options.mode === "persist" && this.saving.version !== this.saving.persisted) throw new Error("collaboration-unsaved-changes");
      this.generation++; this.lifetime.abort(); this.provider?.destroy(); this.history?.destroy();
      this.document.off("update", this.updated); this.notifications.destroy();
      if (!("document" in this.options)) this.document.destroy();
      this.store.update({ lifecycle: "closed", connection: "disconnected", synced: false }); this.store.destroy();
    } finally { this.closing = false; }
  }

  /** @param error - Projection or model mismatch requiring recovery. */
  private fault(error: unknown): void {
    if (["faulted", "closed"].includes(this.state.lifecycle)) return;
    this.store.update({ lifecycle: "faulted", error }); this.disconnect(); this.lease?.refresh();
  }

  /** @returns Effective local source write permission. */
  private writable(): boolean {
    return this.state.lifecycle === "ready" && this.state.permission === "write" && !this.closing
      && (!("offlineEditing" in this.options) || this.options.offlineEditing !== "readonly" || this.state.connection === "connected");
  }

  /** Creates the one history identity after authoritative initialization. */
  private initializeHistory(): void { this.history ??= new CollaborationHistory(this.document.getText("source"), this.origin, this.notifications, this.options.captureTimeout); }

  /** @param patch - Authoritative connection facts. */
  private report(patch: CollaborationTransportState): void {
    if (this.state.lifecycle === "closed") return;
    if (patch.epoch && this.admitted && patch.epoch !== this.admitted.epoch) {
      this.store.update({ lifecycle: "recovery", error: new Error("collaboration-epoch-changed") }); this.provider?.disconnect();
      patch = { connection: "disconnected", synced: false };
    }
    const { epoch: _epoch, ...state } = patch;
    this.store.update(state); this.lease?.refresh();
  }

  /** @param options - Host cancellation. @returns Initial synchronization for the current generation. */
  private async connect(options: CollaborationRequestOptions): Promise<void> {
    if (!("provider" in this.options)) return;
    const generation = ++this.generation, attempt = new AbortController(); this.connecting = attempt;
    const signal = requestSignal(this.lifetime.signal, AbortSignal.any([attempt.signal, ...(options.signal ? [options.signal] : [])]));
    const alreadyReady = !!this.history;
    this.provider?.destroy();
    this.store.update({ lifecycle: alreadyReady ? "ready" : "preparing", connection: "connecting", synced: false, error: undefined });
    try {
      signal.throwIfAborted();
      const provider = this.options.provider({ documentId: this.options.documentId, document: this.document,
        report: state => { if (generation === this.generation) this.report(state); } });
      this.provider = provider;
      const manifest = await cancellable(provider.open(signal), signal);
      signal.throwIfAborted(); validateManifest(manifest, this.options.documentId);
      if (this.admitted && (manifest.epoch !== this.admitted.epoch || manifest.sourceFormat.bom !== this.admitted.sourceFormat.bom
        || manifest.sourceFormat.lineEnding !== this.admitted.sourceFormat.lineEnding)) {
        this.store.update({ lifecycle: "recovery" }); throw new Error("collaboration-epoch-changed");
      }
      if (manifest.permission === "read" && this.saving.version !== this.saving.persisted) {
        this.store.update({ lifecycle: "recovery", permission: "read" }); throw new Error("collaboration-permission-revoked");
      }
      this.admitted = Object.freeze({ ...manifest, sourceFormat: Object.freeze({ ...manifest.sourceFormat }) });
      this.store.update({ permission: manifest.permission }); this.lease?.refresh();
      await cancellable(provider.connect(this.admitted, signal), signal);
      signal.throwIfAborted(); if (generation !== this.generation) throw new Error("collaboration-stale-connection");
      if (["faulted", "recovery"].includes(this.state.lifecycle)) throw new Error("collaboration-session-unavailable");
      validateDocument(this.document); this.initializeHistory();
      this.store.update({ lifecycle: "ready", connection: "connected",
        durability: provider.saveCheckpoint ? (this.saving.version === this.saving.persisted ? "clean" : "dirty") : "unsupported" });
      this.lease?.refresh();
    } catch (error) {
      if (generation === this.generation) {
        this.provider?.disconnect(); this.store.update({ lifecycle: ["recovery", "faulted"].includes(this.state.lifecycle) ? this.state.lifecycle : alreadyReady ? "ready" : "failed",
          connection: "disconnected", synced: false, error }); this.lease?.refresh();
      }
      throw error;
    } finally { if (this.connecting === attempt) this.connecting = undefined; }
  }

  /** @param _update - Binary change already held by Yjs. @param _origin - Transaction origin. @param _document - Source owner. @param transaction - Whether the change was authored locally. */
  private readonly updated = (_update: Uint8Array, _origin: unknown, _document: Doc, transaction: Transaction): void => {
    this.updateVersion++;
    if (this.state.lifecycle !== "preparing" && this.state.lifecycle !== "idle" && transaction.local) this.saving.changed();
    if (this.state.lifecycle === "ready" && this.document.share.size !== 1) this.fault(new Error("collaboration-source-type"));
  };
}

/** @param options - Host document and provider factory. @returns Unconnected host-owned session. */
export function createCollaborationSession(options: CollaborationOptions): CollaborationSession { return new CollaborationSession(options); }

/** @param options - Explicitly initialized host-owned document. @returns Ready session that never destroys the borrowed document. */
export function adoptCollaborationSession(options: AdoptCollaborationOptions): CollaborationSession { return new CollaborationSession(options); }
