import type { Doc } from "yjs";
import type { SourceFormat } from "@quirekit/msfe-core/source-provider";
import type { CollaborationPresenceTransport } from "../transport/types";

/** Authority-provided identity and file policy for one shared Markdown document. */
export interface CollaborationManifest {
  /** Stable host document identity. */
  readonly documentId: string;
  /** Nonempty generation, changed on destructive restore or replacement. */
  readonly epoch: string;
  /** Immutable policy for explicit Markdown export. */
  readonly sourceFormat: SourceFormat;
  /** Current server-granted permission, independent of the UI readOnly setting. */
  readonly permission: "read" | "write";
}

/** Observable session state; synchronization is never a persistence receipt. */
export interface CollaborationState {
  /** Preparation and consistency lifecycle. */
  readonly lifecycle: "idle" | "preparing" | "ready" | "failed" | "faulted" | "recovery" | "closed";
  /** Network reachability. */
  readonly connection: "disconnected" | "connecting" | "connected";
  /** Most recent authoritative permission. */
  readonly permission: "read" | "write";
  /** Whether the provider has acknowledged all pending updates. */
  readonly synced: boolean;
  /** Durability of the latest local mutation, independent of connected/synced. */
  readonly durability: "unsupported" | "clean" | "dirty" | "saving" | "persisted" | "error";
  /** Original fault or transport diagnostic, retained for host recovery. */
  readonly error?: unknown;
}

/** Transport events, restricted to the session to which the driver was opened. */
export interface CollaborationTransportState {
  /** Network reachability, if changed. */
  readonly connection?: CollaborationState["connection"];
  /** Protocol synchronization status, if changed. */
  readonly synced?: boolean;
  /** Permission changes received from the authority. */
  readonly permission?: "read" | "write";
  /** Detected server epoch, if changed. */
  readonly epoch?: string;
  /** Transport diagnostic; disconnection alone does not corrupt local state. */
  readonly error?: unknown;
}

/** Full binary save request, encoded only at an explicit checkpoint boundary. */
export interface CollaborationCheckpoint {
  /** Document identity to which the checkpoint belongs. */
  readonly documentId: string;
  /** Generation of the original CRDT identity. */
  readonly epoch: string;
  /** Stable identity for idempotent retries of this exact checkpoint. */
  readonly requestId: string;
  /** Binary Yjs update including deletion information. */
  readonly update: Uint8Array;
}

/** Receipt issued only after the request has been included in durable storage. */
export interface CollaborationReceipt {
  /** Persisted document identity. */
  readonly documentId: string;
  /** Persisted generation. */
  readonly epoch: string;
  /** Exact checkpoint request covered by the database commit. */
  readonly requestId: string;
  /** Nonempty storage revision for this committed snapshot. */
  readonly revision: string;
}

/** Inputs for an isolated transport instance. No editor or view objects cross this boundary. */
export interface CollaborationProviderContext {
  /** Stable document requested by the host. */
  readonly documentId: string;
  /** Borrowed Y.Doc belonging to this session only. */
  readonly document: Doc;
  /** @param state - Connection, permission or epoch notification. */
  report(state: CollaborationTransportState): void;
}

/** Host-implemented Yjs driver. A transport URL alone cannot supply application identity or durability. */
export interface CollaborationProvider {
  /** @returns Optional ephemeral channel lease, allocated only for an explicit presence consumer. */
  acquirePresence?(): CollaborationPresenceTransport;
  /** @param payload - Text message for server-side extensions, such as activity hints. @returns Whether it was handed to a live connection. */
  sendStateless?(payload: string): boolean;
  /** @param signal - Cancellable bootstrap. @returns Authoritative document identity, format and permission. */
  open(signal: AbortSignal): Promise<CollaborationManifest>;
  /** @param manifest - Validated admission. @param signal - Cancellable initial sync. @returns Completion after initial synchronization. */
  connect(manifest: CollaborationManifest, signal: AbortSignal): Promise<void>;
  /** Pauses the connection while retaining the session document. */
  disconnect(): void;
  /** Releases only driver-owned resources. */
  destroy(): void;
  /** @param checkpoint - Immutable binary save request. @param signal - Cancellation. @returns Post-commit durable receipt. */
  saveCheckpoint?(checkpoint: CollaborationCheckpoint, signal: AbortSignal): Promise<CollaborationReceipt>;
}

/** Factory invoked only by explicit preparation, never while configuring an extension. */
export type CollaborationProviderFactory = (context: CollaborationProviderContext) => CollaborationProvider;

/** Host choices for a new session; editor instances remain synchronous consumers. */
export interface CollaborationOptions {
  /** Document to open; new document creation belongs to the authority. */
  readonly documentId: string;
  /** Per-session connection factory. */
  readonly provider: CollaborationProviderFactory;
  /** Defaults to buffer in memory; readonly prevents new offline edits. */
  readonly offlineEditing?: "buffer" | "readonly";
  /** Local input history grouping window, in milliseconds. */
  readonly captureTimeout?: number;
}

/** Adoption of an already initialized CRDT identity, with explicitly borrowed resource ownership. */
export interface AdoptCollaborationOptions {
  /** Host-owned document, never destroyed by this session. */
  readonly document: Doc;
  /** Host assertion of completed initialization and current permission. */
  readonly manifest: CollaborationManifest;
  /** Local input history grouping window, in milliseconds. */
  readonly captureTimeout?: number;
}

/** Crash/rejection recovery material, retaining the binary identity and readable source. */
export interface CollaborationRecovery {
  /** Validated session admission at the time of capture. */
  readonly manifest: CollaborationManifest;
  /** Full binary CRDT checkpoint, including deletes. */
  readonly update: Uint8Array;
  /** Last editor-accepted source when available, otherwise current logical shared text. */
  readonly source: string;
  /** Session status explaining any inconsistency or pending work. */
  readonly state: CollaborationState;
}

/** Explicit close policy, never inferred from component unmount. */
export type CollaborationCloseOptions = { readonly mode: "persist"; readonly signal?: AbortSignal }
  | { readonly mode: "checkpoint"; readonly persistRecovery: (record: CollaborationRecovery) => Promise<void> }
  | { readonly mode: "discard" };

/** Optional cancellation for preparation and explicit durable save. */
export interface CollaborationRequestOptions {
  /** Host cancellation; cancellation preserves in-memory content. */
  readonly signal?: AbortSignal;
}
