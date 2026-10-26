import { EditorSelection, Prec, type SelectionRange } from "@quirekit/cm-state";
import { Direction, keymap, type EditorView } from "@quirekit/cm-view";
import { readSourcePresentation } from "../../presentation/state";
import { boundariesAt, editingBoundaryRules, editingBoundarySources } from "./registry";
import { editingCursor } from "./selection";

/** @param view - Native geometry owner. @param range - Current caret. @param next - Already measured native candidate. @param forward - Logical direction. @returns First real vertical line beyond a declared block shell. */
function vertical(view: EditorView, range: SelectionRange, next: SelectionRange, forward: boolean): SelectionRange {
  const seen = new Set<number>([range.head]);
  while (!seen.has(next.head) && boundariesAt(view.state, next.head).some(value => value.kind === "block"
    && (next.head < value.contentFrom || next.head > value.contentTo) || value.kind === "syntax"
    && view.state.doc.lineAt(value.from).from === value.from && view.state.doc.lineAt(value.to).to === value.to)) {
    seen.add(next.head);
    const moved = view.moveVertically(next, forward);
    if (moved.head === next.head) break;
    next = moved;
  }
  return editingCursor(view.state, next, forward ? 1 : -1);
}

/** @param view - Native geometry owner. @param range - Collapsed range. @param next - Already measured native candidate. @param right - Visual direction. @returns A distinct native character stop after hidden style or block boundaries. */
function horizontal(view: EditorView, range: SelectionRange, next: SelectionRange, right: boolean): SelectionRange {
  const forward = right === (view.textDirectionAt(range.head) === Direction.LTR);
  const seen = new Set<number>([range.head]);
  for (;;) {
    const normalized = editingCursor(view.state, next, forward ? 1 : -1);
    const hiddenStep = boundariesAt(view.state, range.head).some(value => value.kind === "syntax"
      && range.head >= value.from && range.head <= value.to && normalized.head >= value.from && normalized.head <= value.to);
    if (normalized.head !== range.head && !hiddenStep || seen.has(next.head)) return normalized;
    // A content-first style maps its outside mark back to the same insertion.
    // Consume that hidden duplicate while native movement retains graphemes/BiDi.
    seen.add(next.head);
    next = view.moveByChar(next, forward);
  }
}

/** @param axis - Native motion family. @param forward - Visual right/down. @param extend - Preserve the selection anchor. @returns Shared navigation only when semantic normalization changes the native result. */
function move(axis: "horizontal" | "vertical", forward: boolean, extend = false) {
  return (view: EditorView): boolean => {
    const presentation = readSourcePresentation(view.state), selection = view.state.selection;
    if (!(view.state.facet(editingBoundaryRules).size || view.state.facet(editingBoundarySources).length) || presentation.mode !== "live" || presentation.composing || presentation.selecting
      || !extend && selection.ranges.some(range => !range.empty)) return false;
    let changed = false;
    const ranges = selection.ranges.map(range => {
      const caret = EditorSelection.cursor(range.head, range.assoc, range.bidiLevel ?? undefined, range.goalColumn);
      const logical = forward === (view.textDirectionAt(caret.head) === Direction.LTR);
      const native = axis === "vertical" ? view.moveVertically(caret, forward) : view.moveByChar(caret, logical);
      const next = axis === "vertical" ? vertical(view, caret, native, forward) : horizontal(view, caret, native, forward);
      if (!next.eq(native, true)) changed = true;
      return extend ? EditorSelection.range(range.anchor, next.head, next.goalColumn, next.bidiLevel ?? undefined) : next;
    });
    if (!changed) return false;
    view.dispatch({ selection: EditorSelection.create(ranges, selection.mainIndex), userEvent: "select", scrollIntoView: true });
    return true;
  };
}

/** Geometry stays native; a single adapter covers all registered block and style owners. */
export const boundaryNavigation = Prec.high(keymap.of([
  { key: "ArrowLeft", run: move("horizontal", false), shift: move("horizontal", false, true) },
  { key: "ArrowRight", run: move("horizontal", true), shift: move("horizontal", true, true) },
  { key: "ArrowUp", run: move("vertical", false), shift: move("vertical", false, true) },
  { key: "ArrowDown", run: move("vertical", true), shift: move("vertical", true, true) },
]));
