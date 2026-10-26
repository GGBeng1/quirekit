import type { WhiteboardScene } from "@quirekit/whiteboard";

/** Versioned local checkpoint, separate from the canonical document and its preview. */
export interface WhiteboardDraftRecord {
  /** Checkpoint schema version. */ readonly version: 1;
  /** Unique write identity used by atomic compare-and-swap. */ readonly token: string;
  /** Wall-clock checkpoint time in milliseconds. */ readonly updatedAt: number;
  /** SHA-256 of the captured canonical baseline. */ readonly base: string;
  /** Native source with embedded image assets. */ readonly scene: WhiteboardScene;
}
/** Host-replaceable persistence; comparisons and mutations must share one transaction. */
export interface WhiteboardDraftStore {
  /** @param key - Scoped identity. @returns Untrusted stored value, or null when absent. */
  load(key: string): Promise<unknown | null>;
  /** @param key - Scoped identity. @param expectedToken - Previously observed token, or null for absence. @param record - Validated replacement. @returns Whether the atomic comparison accepted this write. */
  save(key: string, expectedToken: string | null, record: WhiteboardDraftRecord): Promise<boolean>;
  /** @param key - Scoped identity. @param expectedToken - Exact checkpoint being discarded. @returns Whether that checkpoint was removed. */
  remove(key: string, expectedToken: string): Promise<boolean>;
}
/** Explicit document identity captured when a workspace opens. */
export interface WhiteboardDraftOptions {
  /** Stable host/application namespace; never inferred from the current URL. */ readonly namespace: string;
  /** Stable host-owned document identity that survives reload. */ readonly documentId: string;
  /** An unsaved insertion uses a separate per-document recovery slot. */ readonly insertion?: boolean;
  /** Optional host persistence, otherwise the mounted window's IndexedDB. */ readonly store?: WhiteboardDraftStore;
}
/** Product binding evaluated for each new authoring request. */
export interface WhiteboardDraftBinding {
  /** Application namespace shared by its tabs. */ readonly namespace: string;
  /** @returns Current stable document identity, or null to disable local recovery. */ readonly documentId: () => string | null;
  /** Optional atomic host store. */ readonly store?: WhiteboardDraftStore;
}
/** Small UI state, emitted only at storage boundaries. */
export interface WhiteboardDraftState {
  /** Loading blocks editing until an existing checkpoint has been inspected. */ readonly status: "loading" | "ready" | "recovery" | "conflict" | "unavailable";
  /** Validated checkpoint requiring an explicit recovery/discard decision. */ readonly candidate?: WhiteboardDraftRecord;
  /** Most recent successful backup time. */ readonly savedAt?: number;
  /** New source invalidations are not yet covered by a committed checkpoint. */ readonly pending?: boolean;
  /** Original storage/conflict failure, translated only at the UI boundary. */ readonly error?: unknown;
}
/** Headless session dependencies, with no rendering or document write access. */
export interface DraftSessionOptions {
  /** Scoped storage key. */ readonly key: string;
  /** Hash of the immutable initial document. */ readonly base: string;
  /** Atomic storage port. */ readonly store: WhiteboardDraftStore;
  /** @returns Detached passive scene, or null while input is unstable. */ readonly capture: () => WhiteboardScene | null;
  /** @param state - Infrequent persistence/recovery state. */ readonly changed: (state: WhiteboardDraftState) => void;
}
/** One open drawing task, independent of a host's document persistence. */
export interface DraftSession {
  /** Initial storage inspection completion. */ readonly ready: Promise<void>;
  /** Most recent presentation state. */ readonly state: WhiteboardDraftState;
  /** O(1) invalidation; schedules bounded idle/max-wait checkpoints. */ change(): void;
  /** @returns Completion of pending passive source writes. */ checkpoint(): Promise<void>;
  /** @param apply - Explicit user-approved scene import. @returns Recovery completion, without committing to the host. */ restore(apply: (scene: WhiteboardScene) => void | Promise<void>): Promise<void>;
  /** @returns Whether the inspected recovery candidate was discarded. */ discard(): Promise<boolean>;
  /** @returns Whether the session's checkpoint was cleared after an explicit save/discard. */ finish(): Promise<boolean>;
  /** Best-effort final checkpoint before releasing a runtime; does not discard source. */ dispose(): void;
}
/** Inputs for deterministic baseline/key derivation. */
export interface DraftIdentity {
  /** Collision-free composite storage key. */ readonly key: string;
  /** Baseline hash that excludes generated PNG data. */ readonly base: string;
}
