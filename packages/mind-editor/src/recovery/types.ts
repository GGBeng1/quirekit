import type { MindMapContentUpdate, MindMapDocument } from "@quirekit/mind-map";

/** Passive workspace content; unfinished fields remain separate from valid source. */
export interface MindEditorCheckpoint {
  /** Detached canonical source including stable native input text. */ readonly document: MindMapDocument;
  /** Bounded property drafts, potentially unfinished URLs or captions. */ readonly pending: MindMapContentUpdate;
  /** Last input/selected topic, restored without persisting renderer geometry. */ readonly selectedId: string | null;
}
/** Versioned local checkpoint, distinct from host source and cloud persistence. */
export interface MindMapRecoveryRecord {
  /** Local storage schema. */ readonly version: 1;
  /** Unique token for transaction-level comparison. */ readonly token: string;
  /** Epoch milliseconds of capture. */ readonly updatedAt: number;
  /** Semantic baseline fingerprint at task opening. */ readonly base: string;
  /** Valid source and bounded unfinished fields. */ readonly checkpoint: MindEditorCheckpoint;
}
/** Host-replaceable local storage with atomic comparison across tabs. */
export interface MindMapRecoveryStore {
  /** @param key - Scoped task slot. @returns Untrusted record or null. */ load(key: string): Promise<unknown | null>;
  /** @param key - Slot. @param expected - Observed token, null for absent. @param record - New record.
   * @returns Whether the transaction saved without overwriting another version. */
  save(key: string, expected: string | null, record: MindMapRecoveryRecord): Promise<boolean>;
  /** @param key - Slot. @param expected - Exact inspected token. @returns Whether this version was removed. */
  remove(key: string, expected: string): Promise<boolean>;
}
/** Explicit stable identity; omission disables all recovery work. */
export interface MindEditorRecoveryOptions {
  /** Product/account-specific scope. */ readonly namespace: string;
  /** Stable host document identity, never inferred from the URL. */ readonly documentId: string;
  /** Stable embed ID, or a host-chosen standalone slot. */ readonly targetId: string;
  /** Explicit pending insertion; its generated root identity is not a baseline. */ readonly insertion?: boolean;
  /** Storage port; omitted uses the mounted window's IndexedDB. */ readonly store?: MindMapRecoveryStore;
}
/** Registration on a real host editor; each task captures the current document ID. */
export interface MindMapRecoveryBinding {
  /** Product/account-specific scope. */ readonly namespace: string;
  /** @returns Stable current document identity, or null to disable recovery. */ readonly documentId: () => string | null;
  /** Optional custom atomic storage. */ readonly store?: MindMapRecoveryStore;
}
/** Small infrequently published storage state, never a live source subscription. */
export interface MindMapRecoveryState {
  /** Recovery admission and storage availability. */ readonly status: "loading" | "ready" | "recovery" | "conflict" | "unavailable";
  /** Last inspected record, retained for export even on a stale baseline. */ readonly candidate?: MindMapRecoveryRecord;
  /** Last completed local write. */ readonly savedAt?: number;
  /** Whether invalidations remain unsaved. */ readonly pending?: boolean;
  /** Coded failure, leaving current editing available. */ readonly error?: unknown;
}
/** Per-task headless lifecycle. */
export interface MindMapRecoverySessionOptions {
  /** Stable scoped storage key. */ readonly key: string;
  /** SHA-256 semantic baseline. */ readonly base: string;
  /** Atomic persistence port. */ readonly store: MindMapRecoveryStore;
  /** @returns Passive stable source, or null while input/operations are unfinished. */ readonly capture: () => MindEditorCheckpoint | null;
  /** @param state - Small changed state. */ readonly changed: (state: MindMapRecoveryState) => void;
}
/** Recoverable local editing task; never commits the host. */
export interface MindMapRecoverySession {
  /** Initial storage admission. */ readonly ready: Promise<void>;
  /** Last published state. */ readonly state: MindMapRecoveryState;
  /** O(1) invalidation, without serialization. */ change(): void;
  /** @param closing - Capture one final stable state. @returns Completion of queued writes. */ checkpoint(closing?: boolean): Promise<void>;
  /** @param apply - Independent workspace restore. @returns Restore completion. */ restore(apply: (checkpoint: MindEditorCheckpoint) => Promise<void>): Promise<void>;
  /** @returns Whether explicit discard removed the observed version. */ discard(): Promise<boolean>;
  /** @returns Whether explicit save/cancel cleared this task; late writes cannot recreate it. */ finish(): Promise<boolean>;
  /** Captures before forced unmount; retains the last completed checkpoint. */ dispose(): void;
}
/** Scoped storage identity without renderer or host pointers. */
export interface MindMapRecoveryIdentity {
  /** Encoded namespace/document/target tuple. */ readonly key: string;
  /** Semantic source baseline. */ readonly base: string;
}
