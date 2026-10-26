import { HocuspocusProvider, HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import type { CollaborationCheckpoint, CollaborationManifest, CollaborationProvider, CollaborationProviderContext,
  CollaborationProviderFactory, CollaborationReceipt, CollaborationPresenceTransport } from "@quirekit/msfe-collaboration";
import { credential, openManifest } from "./http";
import { acquireHocuspocusPresence } from "./presence";
import type { HocuspocusProviderOptions, HocuspocusSessionManifest } from "./types";

/** One host-owned transport, with no Awareness allocation or network work before preparation. */
class HocuspocusDriver implements CollaborationProvider {
  private manifest: HocuspocusSessionManifest | undefined;
  private socket: HocuspocusProviderWebsocket | undefined;
  private provider: HocuspocusProvider | undefined;
  private disposed = false;
  private presence: CollaborationPresenceTransport | undefined;
  /** Periodic resync owned by the driver, so its round trip is not reported as a local unsaved change. */
  private resync: ReturnType<typeof setInterval> | undefined;
  /** True only while the driver itself starts a resync round. */
  private resyncing = false;
  /** Optional capability populated only when admission provides a durable endpoint. */
  saveCheckpoint?: (checkpoint: CollaborationCheckpoint, signal: AbortSignal) => Promise<CollaborationReceipt>;

  /** @param options - Explicit service configuration. @param context - Isolated session identity and status. */
  constructor(private readonly options: HocuspocusProviderOptions, private readonly context: CollaborationProviderContext) {}

  /** @returns Optional Awareness lease; the source-only connection allocates none. */
  acquirePresence(): CollaborationPresenceTransport {
    if (this.disposed || !this.provider || !this.socket) throw new Error("collaboration-presence-unavailable");
    if (this.presence) throw new Error("collaboration-presence-already-acquired");
    return this.presence = acquireHocuspocusPresence(this.provider, this.socket, () => { this.presence = undefined; });
  }

  /** @param payload - Text for server-side extensions. @returns Whether a live provider sent it. */
  sendStateless(payload: string): boolean {
    if (this.disposed || !this.provider) return false;
    this.provider.sendStateless(payload);
    return true;
  }

  /** @param signal - Cancellable admission. @returns Application identity before any binary synchronization. */
  async open(signal: AbortSignal): Promise<CollaborationManifest> {
    const manifest = await openManifest(this.options, this.context.documentId, signal);
    if (this.disposed) throw new Error("collaboration-provider-disposed");
    this.manifest = manifest;
    if (manifest.checkpointEndpoint) this.saveCheckpoint = (checkpoint, abort) => this.save(checkpoint, abort);
    return manifest;
  }

  /** @param manifest - Validated session admission. @param signal - Initial sync cancellation. @returns Completion after protocol synchronization only. */
  connect(manifest: CollaborationManifest, signal: AbortSignal): Promise<void> {
    if (this.disposed || !this.manifest || this.manifest.epoch !== manifest.epoch) return Promise.reject(new Error("collaboration-provider-admission"));
    return new Promise((resolve, reject) => {
      let settled = false;
      let received = false, pending = 1, resyncRound = 0;
      /** @param error - Optional authentication/cancellation failure. */
      const finish = (error?: unknown) => {
        if (settled) return; settled = true; signal.removeEventListener("abort", abort);
        if (error) reject(error); else resolve();
      };
      /** Stops a cancelled handshake and its socket timers. */
      const abort = () => { this.disconnect(); finish(signal.reason ?? new Error("collaboration-aborted")); };
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) { abort(); return; }
      this.socket = new HocuspocusProviderWebsocket({ url: this.options.url, autoConnect: false, maxAttempts: 1,
        // Every later connection must obtain a fresh application admission through session.prepare().
        onClose: () => { this.disconnect(); finish(new Error("collaboration-disconnected")); },
        onMaxAttemptsFailed: event => { this.disconnect(); finish(event.error); },
        ...(this.options.WebSocketPolyfill ? { WebSocketPolyfill: this.options.WebSocketPolyfill } : {}) });
      this.provider = new HocuspocusProvider({ websocketProvider: this.socket, document: this.context.document,
        name: this.manifest!.room, awareness: null,
        token: this.manifest!.connectionToken ?? (() => credential(this.options)),
        onSynced: event => { received = event.state; this.context.report({ synced: received && pending === 0 }); if (received) finish(); },
        onUnsyncedChanges: event => {
          // A resync resets the counter to one for its own round trip. Count that entry as unsaved only when local
          // changes were already pending; otherwise an idle document would report "saving" on every resync.
          if (this.resyncing) resyncRound = pending > 0 ? 0 : 1;
          if (event.number === 0) resyncRound = 0;
          pending = Math.max(0, event.number - resyncRound);
          this.context.report({ synced: received && pending === 0 });
        },
        onAuthenticated: event => this.context.report({ permission: event.scope === "readonly" ? "read" : this.manifest!.permission }),
        onStatus: event => this.context.report({ connection: event.status === "connected" ? "connected" : event.status === "connecting" ? "connecting" : "disconnected" }),
        onAuthenticationFailed: event => { const error = new Error(`collaboration-authentication: ${event.reason}`);
          this.context.report({ permission: "read", connection: "disconnected", synced: false, error }); this.disconnect(); finish(error); },
        onStateless: event => this.control(event.payload),
      });
      this.provider.attach();
      // Without Awareness, periodic sync replies keep the transport's liveness check meaningful.
      this.resync = setInterval(() => {
        if (!this.provider) return;
        this.resyncing = true;
        try { this.provider.forceSync(); } finally { this.resyncing = false; }
      }, 15_000);
      void this.socket.connect().catch(finish);
    });
  }

  /** Stops sending/retrying while retaining the borrowed Y.Doc. */
  disconnect(): void {
    this.presence?.release();
    clearInterval(this.resync); this.resync = undefined;
    const provider = this.provider, socket = this.socket; this.provider = undefined; this.socket = undefined;
    // Shut the wire before provider.destroy(), which may flush its remaining update queue.
    socket?.destroy(); provider?.destroy(); this.context.report({ connection: "disconnected", synced: false });
  }

  /** Idempotently disposes driver resources, without destroying the session document. */
  destroy(): void { if (this.disposed) return; this.disposed = true; this.disconnect(); }

  /** @param payload - Authenticated service control message; other stateless messages are ignored. */
  private control(payload: string): void {
    try {
      const message = JSON.parse(payload) as { type?: string; epoch?: string; permission?: "read" | "write" };
      if (message.type !== "msfe.session" || typeof message.epoch !== "string" || !["read", "write"].includes(message.permission ?? "")) return;
      this.context.report({ epoch: message.epoch, permission: message.permission! });
      if (message.permission === "read") this.disconnect();
    } catch { /* Other service stateless payloads do not change session permissions. */ }
  }

  /** @param checkpoint - Exact binary save request. @param signal - Cancellation. @returns Authority-issued post-commit receipt. */
  private async save(checkpoint: CollaborationCheckpoint, signal: AbortSignal): Promise<CollaborationReceipt> {
    const endpoint = this.manifest?.checkpointEndpoint;
    if (!endpoint || this.disposed) throw new Error("collaboration-durability-unsupported");
    const token = await credential(this.options); signal.throwIfAborted();
    const response = await (this.options.fetch ?? globalThis.fetch)(endpoint, { method: "POST", signal, redirect: "error",
      headers: { "Content-Type": "application/octet-stream", "X-MSFE-Document": encodeURIComponent(checkpoint.documentId),
        "X-MSFE-Epoch": encodeURIComponent(checkpoint.epoch), "X-MSFE-Request": checkpoint.requestId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: checkpoint.update.slice().buffer });
    if (!response.ok) throw new Error(`collaboration-checkpoint-http-${response.status}`);
    return response.json() as Promise<CollaborationReceipt>;
  }
}

/** @param options - Explicit Hocuspocus and application-service endpoints. @returns Inert factory; preparation allocates the transport. */
export function hocuspocusProvider(options: HocuspocusProviderOptions): CollaborationProviderFactory {
  return context => new HocuspocusDriver(options, context);
}
