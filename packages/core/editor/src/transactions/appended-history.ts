import type { Transaction } from "@quirekit/pm";

/**
 * Keeps an appended normalization out of undo history when the dispatched root did not change the document.
 *
 * A selection or focus transaction can trigger document repairs such as a trailing paragraph; those repairs
 * are not reader edits, so undo must not revert them. Repairs following a content edit stay in that edit's step.
 *
 * @param transactions - Transactions the appending plugin received.
 * @param appended - Normalization the plugin is about to return.
 * @returns The same transaction, marked when it must not enter history.
 */
export function inheritQuireAppendedHistory(transactions: readonly Transaction[], appended: Transaction): Transaction {
  const first = transactions[0];
  const root = (first?.getMeta("appendedTransaction") as Transaction | undefined) ?? first;
  return root !== undefined && !root.docChanged ? appended.setMeta("addToHistory", false) : appended;
}
