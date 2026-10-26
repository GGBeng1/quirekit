import { readQuireTransactionRenderImpact } from "@quirekit/core";
import type { Transaction } from "@quirekit/pm";
import type { QuireLayoutDirtyRange, QuireViewInvalidationCause } from "./types";

/**
 * Proves the whole update batch before interpreting a feature's presentation hint.
 *
 * An owned root cannot vouch for appended plugin metadata. Generic selection
 * changes are the only unmarked companion admitted here; unknown or empty
 * transactions conservatively retain full invalidation. Layout dependency
 * authority is checked independently when attempting retained geometry reuse.
 *
 * @param transactions - Every root and appended transaction accepted by Core.
 * @param layoutDirtyRange - Stronger explicit geometry evidence, when available.
 * @returns Presentation cause, conservative fallback, or no new evidence.
 */
export function deriveQuirePresentationTransactionCauses(
  transactions: readonly Transaction[],
  layoutDirtyRange?: QuireLayoutDirtyRange | null
): readonly QuireViewInvalidationCause[] {
  if (!transactions.some(transaction => readQuireTransactionRenderImpact(transaction) !== undefined)) return [];
  if (layoutDirtyRange != null || transactions.some(transaction =>
    transaction.docChanged || transaction.getMeta("composition") !== undefined
  )) return ["fallback"];
  return transactions.every(transaction =>
    readQuireTransactionRenderImpact(transaction) !== undefined
      || (transaction.isGeneric && transaction.selectionSet)
  ) ? ["presentation"] : ["fallback"];
}
