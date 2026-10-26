import { StateEffect, StateField, Transaction, type EditorState } from "@quirekit/cm-state";
import type { EditorView } from "@quirekit/cm-view";
import { sourceInputPosition, type SourceClientPoint } from "@quirekit/msfe-core";

/** Transient menu intent, independent of input focus and source/history. */
export const selectionActionsEffect = StateEffect.define<boolean>();

/** New accepted selections show actions; an explicit resting-range tap toggles them. */
export const mobileSelectionActions = StateField.define<boolean>({
  /** @returns The initial menu request, without acquiring source focus. */
  create: () => true,
  /** @param value - Prior explicit request. @param transaction - Accepted source/selection or menu intent. @returns Latest transient request. */
  update(value, transaction) {
    const request = transaction.effects.find(effect => effect.is(selectionActionsEffect));
    return request ? request.value : transaction.docChanged || !transaction.startState.selection.eq(transaction.state.selection) ? true : value;
  },
});

/** @param state - Current accepted presentation state. @returns Requested menu visibility, without geometry reads. */
export function mobileSelectionActionsVisible(state: EditorState): boolean { return state.field(mobileSelectionActions, false) ?? true; }

/** @param view - Canonical range owner. @param point - Short-tap client point. @returns Whether existing selection handled the tap without acquiring keyboard focus. */
export function tapMobileSelection(view: EditorView, point: SourceClientPoint): boolean {
  const range = view.state.selection.main;
  if (range.empty) return false;
  const pos = sourceInputPosition(view, point);
  if (pos === null || pos < range.from || pos > range.to) return false;
  view.dispatch({ effects: selectionActionsEffect.of(!mobileSelectionActionsVisible(view.state)), annotations: Transaction.addToHistory.of(false) });
  return true;
}
