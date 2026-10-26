import type { Transaction } from "@quirekit/pm";
import type { QuireSelectionNavigation } from "./types";

/** Metadata for explicit selection navigation; never inferred from scrolling or pointer movement. */
export const QUIRE_SELECTION_NAVIGATION_META_KEY = "quirekit:selection-navigation";

const backward: QuireSelectionNavigation = Object.freeze({ direction: -1 });
const forward: QuireSelectionNavigation = Object.freeze({ direction: 1 });

/**
 * Declares fixed-anchor navigation on the transaction that already carries the selection.
 * @param transaction - Existing root transaction; no dispatch or content change is introduced.
 * @param navigation - Logical movement intent, or undefined to clear it.
 * @returns The same transaction for fluent composition.
 */
export function setQuireSelectionNavigation<T extends Transaction>(transaction: T, navigation: QuireSelectionNavigation | undefined): T {
  return transaction.setMeta(QUIRE_SELECTION_NAVIGATION_META_KEY,
    navigation?.direction === -1 ? backward : navigation?.direction === 1 ? forward : undefined);
}

/**
 * Reads a recognized intent; consumers must verify it against the actual selection change.
 * @param transaction - Candidate transaction; metadata is not persistent document state.
 * @returns Logical intent, or undefined for absent or malformed metadata.
 */
export function readQuireSelectionNavigation(transaction: Transaction): QuireSelectionNavigation | undefined {
  const value: unknown = transaction.getMeta(QUIRE_SELECTION_NAVIGATION_META_KEY);
  if (value === null || typeof value !== "object" || !("direction" in value)) return undefined;
  return value.direction === -1 ? backward : value.direction === 1 ? forward : undefined;
}
