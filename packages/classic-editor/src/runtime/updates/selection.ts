import type { QuireEditorSelectionUpdateEvent } from "@quirekit/core";
import type { ClassicEditorPlugin } from "../../types";

/**
 * Admits a selection projection that Core will finish in this synchronous dispatch.
 *
 * Product update hooks observe an already refreshed Shell, so their presence
 * preserves the original per-event path. Without those hooks, the later update
 * event projects after Core extension hooks have settled mutable product inputs.
 *
 * @param event - Accepted Core selection change and its applied transactions.
 * @param plugins - Product lifecycle observers installed by this Classic instance.
 * @returns Whether this selection event can share the subsequent update projection.
 */
export function canCoalesceClassicEditorSelectionProjection(
  event: QuireEditorSelectionUpdateEvent,
  plugins: readonly ClassicEditorPlugin[]
): boolean {
  if (plugins.some(plugin => plugin.onUpdate !== undefined)) return false;
  if (event.transaction.getMeta("preventUpdate")) return false;
  if (!event.transaction.docChanged
    && !event.appendedTransactions.some(transaction => transaction.docChanged)) return false;

  // Match Core's semantic update gate, including appended-only changes and
  // replacements whose new PM identity still describes an equivalent document.
  return !event.previousState.doc.eq(event.editor.state.doc);
}
