import { Transaction } from "@quirekit/cm-state";
import { isolateHistory } from "@quirekit/cm-commands";
import type { EditorView } from "@quirekit/cm-view";
import { changeOrigin, revisionField } from "../state/fields";
import type { MsfeExternalChange, MsfeResult } from "./types";

/** @param view - Canonical mounted owner. @param documentId - Current host identity. @param change - Versioned external edit.
 * @returns Accepted result, retaining local history with mapped positions. The caller checks permission/composition first. */
export function applyExternalChange(view: EditorView, documentId: string, change: MsfeExternalChange): MsfeResult {
  if (change.documentId !== documentId || change.baseRevision !== view.state.field(revisionField)) return { ok: false, reason: "stale-target" };
  let transaction: Transaction;
  try {
    transaction = view.state.update({ changes: change.changes, annotations: [
      changeOrigin.of(change.origin ?? "external"), Transaction.addToHistory.of(false), isolateHistory.of("full"),
    ] });
  } catch { return { ok: false, reason: "invalid-change" }; }
  view.dispatch(transaction);
  return { ok: true };
}
