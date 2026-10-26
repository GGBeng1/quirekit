import { changeOrigin, revisionField } from "../state/fields";
import type { Transaction } from "@quirekit/cm-state";
import type { MsfeChangeEvent, MsfeEditor, MsfeEventDispatchOptions } from "./types";

/**
 * Queues accepted event snapshots so a hook-issued command cannot relabel or reorder its parent's change.
 * @param options - Incremental observers and lifetime/error boundaries.
 * @returns Notification function; it never serializes document text.
 */
export function createEventDispatcher(options: MsfeEventDispatchOptions) {
  const pending: { editor: MsfeEditor; transaction: Transaction; change: MsfeChangeEvent | undefined }[] = [];
  let emitting = false;
  /** @param editor - Accepting editor. @param transactions - Already accepted transactions in order. @param defer - Queue until the atomic source phase finishes. */
  const dispatch = (editor: MsfeEditor, transactions: readonly Transaction[], defer = false): void => {
    for (const transaction of transactions) pending.push({ editor, transaction, change: transaction.docChanged ? {
      documentId: editor.documentId, revision: transaction.state.field(revisionField), changes: transaction.changes,
      selection: transaction.newSelection, origin: transaction.annotation(changeOrigin)
        ?? (transaction.isUserEvent("undo") || transaction.isUserEvent("redo") ? "history" : "user"),
    } : undefined });
    if (emitting || defer) return;
    emitting = true;
    try {
      while (pending.length && !options.destroyed()) {
        const event = pending.shift()!;
        options.transaction(event.editor, event.transaction);
        if (event.change) for (const listener of [...options.listeners]) {
          if (options.destroyed()) break;
          try { listener(event.change); } catch (error) { options.report(error); }
        }
      }
    } finally { emitting = false; pending.length = 0; }
  };
  return Object.assign(dispatch, {
    /** Discards unpublished observations after an unrecoverable commit failure. */
    clear(): void { pending.length = 0; },
  });
}
