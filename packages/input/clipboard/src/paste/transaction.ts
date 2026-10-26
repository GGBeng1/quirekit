import type { QuireEditor, QuireMountedEditorView } from "@quirekit/core";
import { closeHistory, type Slice } from "@quirekit/pm";
import type { QuireClipboardResourcePastePreparation } from "../hooks";

/**
 * Composes structural replacement and resources before a single guarded commit.
 * @param editor - Receiving editor.
 * @param view - Input owner.
 * @param slice - Parsed source before optional resource remapping.
 * @param resources - Already prepared, side-effect-free resource contributions.
 */
export function commitQuireClipboardPaste(
  editor: QuireEditor, view: QuireMountedEditorView, slice: Slice,
  resources: QuireClipboardResourcePastePreparation | null
): void {
  const before = editor.state.pm;
  const transaction = before.tr;
  const source = resources?.slice ?? slice;
  // Domain adapters receive the same transaction as resources; no intermediate
  // selection or history entry can escape if geometry/protection rejects it.
  if (view.someProp("quireClipboardPaste", prepare => prepare(transaction, source, view)) !== true) {
    transaction.replaceSelection(source);
  }
  if (transaction.getMeta("preventDispatch") === true) {
    editor.emit("clipboardPasteResult", { editor, transaction, status: "rejected", reason: "prevent-dispatch" });
    return;
  }
  for (const contribution of resources?.contributions ?? []) contribution.apply(transaction);
  closeHistory(transaction);
  editor.dispatchTransaction(transaction.setMeta("uiEvent", "paste"));
  // Core/filterTransaction may refuse a valid plan. Comparing state identity also
  // accepts equal-content pastes and revision-owned rewritten transactions.
  const rejected = editor.state.pm === before;
  editor.emit("clipboardPasteResult", { editor, transaction,
    status: rejected ? "rejected" : "applied", reason: rejected ? "filtered" : null });
}
