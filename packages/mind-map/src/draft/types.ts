import type { MindMapDocument } from "../model/types";

/** Outcome of one synchronous host transaction. */
export type MindMapCommitResult = "saved" | "conflict" | "readonly" | "missing";

/** Compare-and-swap request; identity and revision are checked inside the host transaction. */
export interface MindMapCommitRequest {
  /** Stable host block identity, never a stale array position. */
  readonly targetId: string;
  /** Revision observed when this session opened. */
  readonly expectedRevision: number;
  /** Complete validated replacement, with the revision incremented once. */
  readonly document: MindMapDocument;
}

/**
 * Performs the host's permission, existence and revision checks and write atomically.
 * @param request - Immutable replacement and compare-and-swap preconditions.
 * @returns Result of the synchronous outer transaction.
 */
export type MindMapCommit = (request: MindMapCommitRequest) => MindMapCommitResult;

/** A detached authoring session which never owns the host document. */
export interface MindMapDraft {
  /** @returns The immutable current draft; throws after save or cancellation. */
  getDocument(): MindMapDocument;
  /**
   * Replaces the draft while retaining its base revision.
   * @param document - New document from an editor or validated source edit.
   */
  replace(document: MindMapDocument): void;
  /**
   * Submits one transaction and closes only after success.
   * @param commit - Synchronous host transaction callback.
   * @returns Host outcome; conflicts keep the draft available.
   */
  save(commit: MindMapCommit): MindMapCommitResult;
  /** Closes the session without calling the host; repeated cancellation is harmless. */
  cancel(): void;
}
