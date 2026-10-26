import { Transaction } from "@quirekit/cm-state";
import type { EditorView } from "@quirekit/cm-view";
import { compositionField } from "../state/fields";
import type { MsfeResult, MsfeViewStateUpdate } from "./types";

/** @param view - Mounted canonical owner. @param update - Effects, optional selection and explicit scroll ownership. @returns Acceptance after validating the planned transaction, with no source/history mutation. */
export function applyViewStateUpdate(view: EditorView, update: MsfeViewStateUpdate): MsfeResult {
  if (view.state.field(compositionField, false) || view.compositionStarted) return { ok: false, reason: "composing" };
  if (Object.keys(update).some(key => key !== "effects" && key !== "selection" && key !== "preserveScroll")
    || update.preserveScroll !== undefined && typeof update.preserveScroll !== "boolean") return { ok: false, reason: "invalid-change" };
  try {
    // Preserve position by default; an explicit caller scroll must supersede that fallback snapshot.
    const transaction = view.state.update({ effects: [...(update.preserveScroll !== false ? [view.scrollSnapshot()] : []), ...update.effects],
      ...(update.selection ? { selection: update.selection } : {}), annotations: Transaction.addToHistory.of(false) });
    // Inspect the actual filtered transaction, not just the caller's declared shape.
    // A presentation intent may never acquire text edits, configuration ownership or history.
    if (transaction.docChanged || transaction.reconfigured || transaction.annotation(Transaction.addToHistory) !== false) return { ok: false, reason: "invalid-change" };
    view.dispatch(transaction);
    return { ok: true };
  } catch { return { ok: false, reason: "invalid-change" }; }
}
