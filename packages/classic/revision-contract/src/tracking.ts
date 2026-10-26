import type { QuireEditor } from "@quirekit/core";
import type { Node, Transaction } from "@quirekit/pm";

/** Stable metadata key for revision-specific compiler and AI references. */
export const WORD_REVISION_TRANSACTION_META_KEY = "quirekit:word-revision";

/** Minimal native steps that revision admission reads as one owner replacement. */
export interface WordRevisionOwnerReplacement {
  /** Owner position, identical before and after the declared steps. */
  readonly from: number;
  /** Index of the first declared root step. */
  readonly firstStep: number;
  /** Number of consecutive declared root steps. */
  readonly stepCount: number;
}

/** Revision-owned storage query; installed only when the revision engine is present. */
export interface WordRevisionTrackingQuery {
  /**
   * @param document - Current or in-progress chain document.
   * @returns Whether tracked changes are active for this document and session.
   */
  isTrackingEnabled(document: Node): boolean;
}

/**
 * Reads the owner replacement already declared on a transaction.
 * @param transaction - Candidate root transaction.
 * @returns The declared replacement, or undefined when none is recorded.
 */
export function readWordRevisionOwnerReplacement(transaction: Transaction): WordRevisionOwnerReplacement | undefined {
  const value = transaction.getMeta(WORD_REVISION_TRANSACTION_META_KEY) as { ownerReplacement?: WordRevisionOwnerReplacement } | null | undefined;
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value.ownerReplacement : undefined;
}

/**
 * Declares an owner replacement while keeping other revision metadata on the transaction.
 * @param transaction - Transaction receiving the declaration.
 * @param replacement - Steps that together replace one owner node.
 * @returns The same transaction for fluent composition.
 */
export function declareWordRevisionOwnerReplacement<TransactionType extends Transaction>(
  transaction: TransactionType,
  replacement: WordRevisionOwnerReplacement
): TransactionType {
  const current = transaction.getMeta(WORD_REVISION_TRANSACTION_META_KEY);
  const record = current !== null && typeof current === "object" && !Array.isArray(current) ? current : {};
  transaction.setMeta(WORD_REVISION_TRANSACTION_META_KEY, { ...record, ownerReplacement: replacement });
  return transaction;
}

/**
 * Asks the installed revision engine whether changes are tracked; false without one.
 * @param editor - Owning editor session.
 * @param document - Current chain document, when a command has prior steps.
 * @returns Whether tracked changes are active.
 */
export function isWordRevisionTrackingActive(editor: QuireEditor, document: Node = editor.state.doc): boolean {
  const query = editor.storage.wordRevision as Partial<WordRevisionTrackingQuery> | undefined;
  return typeof query?.isTrackingEnabled === "function" && query.isTrackingEnabled(document);
}
