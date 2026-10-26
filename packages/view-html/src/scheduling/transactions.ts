import { combineTransactionSteps } from "@quirekit/core";
import type { Transaction } from "@quirekit/pm";
import type { HtmlComposedTransactions } from "./types";
import { getHtmlChangedRanges } from "./changes";

/**
 * Composes transactions that were applied in successive document spaces.
 *
 * @param transactions - Ordered applied transactions.
 * @returns Final document, initial-to-final mapping, and composed changed ranges.
 */
export function composeHtmlScheduledTransactions(
  transactions: readonly Transaction[]
): HtmlComposedTransactions {
  const first = transactions[0];
  if (first === undefined) {
    throw new Error("Cannot compose an empty HTML transaction batch.");
  }

  const transform = combineTransactionSteps(first.before, transactions);
  const finalTransaction = transactions[transactions.length - 1]!;
  return {
    // Replaying steps is authoritative for the composed mapping, but it creates
    // an equivalent PM node with a different identity. Retained DOM must track
    // the exact document already accepted by editor state.
    documentNode: finalTransaction.doc,
    mapping: transform.mapping,
    changedRanges: getHtmlChangedRanges(transform)
  };
}
