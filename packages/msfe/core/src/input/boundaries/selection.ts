import { EditorSelection, type EditorState, type SelectionRange, type Transaction } from "@quirekit/cm-state";
import { readSourcePresentation } from "../../presentation/state";
import { boundariesActive, boundariesAt } from "./registry";
import type { EditingBoundary } from "./types";

/** @param state - Source owner. @param boundary - Block shell. @param forward - Exterior direction. @returns Neighboring real source edge, or the interior when no exterior exists. */
export function outsideBlock(state: EditorState, boundary: EditingBoundary, forward: boolean): number {
  const line = state.doc.lineAt(forward ? boundary.to : boundary.from);
  return forward ? line.to < state.doc.length ? line.to + 1 : boundary.contentTo
    : line.from > 0 ? line.from - 1 : boundary.contentFrom;
}

/** @param state - Source authority. @param range - Candidate caret. @param direction - Requested logical movement, or zero for a direct placement. @param styles - Collapsed carets normalize style stops; nonempty selections retain their exact markup coverage. @returns A legal source endpoint retaining native association and vertical goal. */
export function editingCursor(state: EditorState, range: SelectionRange, direction: -1 | 0 | 1 = 0, styles = true): SelectionRange {
  if (!boundariesActive(state)) return range;
  let position = range.head, assoc = range.assoc;
  const visited = new Set<string>();
  for (;;) {
    let changed = false;
    for (const boundary of boundariesAt(state, position)) {
      const { from, to, contentFrom, contentTo, kind } = boundary;
      const key = `${kind}/${from}/${to}/${position}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const previous = position;
      if (kind === "separator") {
        if (position > from && position < to) position = direction < 0 ? from : to;
      } else if (kind === "atom" || kind === "syntax") {
        if (position > from && position < to) position = direction < 0 ? from : to;
      } else if (kind === "block") {
        const clamp = boundary.navigation === "content";
        if (position < contentFrom) position = direction < 0 && !clamp ? outsideBlock(state, boundary, false) : contentFrom;
        else if (position > contentTo) position = direction > 0 && !clamp ? outsideBlock(state, boundary, true) : contentTo;
        if (position === contentFrom) assoc = 1;
        else if (position === contentTo) assoc = -1;
      } else if (kind === "prefix") {
        if (position < contentFrom) position = contentFrom;
      } else if (styles && !readSourcePresentation(state).selecting && (position <= contentFrom || position >= contentTo)) {
        if (boundary.navigation !== "split") position = position <= contentFrom ? contentFrom : contentTo;
        else if (position > from && position < contentFrom) position = direction < 0 ? from : contentFrom;
        else if (position > contentTo && position < to) position = direction > 0 ? to : contentTo;
        assoc = position === from ? -1 : position === to ? 1 : position <= contentFrom ? 1 : -1;
      }
      if (position !== previous) {
        // A block's visible content owns its edge geometry; associating with the
        // hidden shell would draw a table caret at the far border of the cell.
        if (kind !== "block" || position !== contentFrom && position !== contentTo) assoc = position < previous ? 1 : -1;
        changed = true; break;
      }
    }
    if (!changed) break;
  }
  return position === range.head && assoc === range.assoc ? range
    : EditorSelection.cursor(position, assoc, range.bidiLevel ?? undefined, range.goalColumn);
}

/** @param transaction - Current native candidate. @returns Corrected endpoints, or null when already legal. */
export function editingSelection(transaction: Transaction): EditorSelection | null {
  const state = transaction.state, selection = state.selection;
  if (!boundariesActive(state)) return null;
  const navigation = transaction.isUserEvent("select") && !transaction.isUserEvent("select.pointer");
  const ranges = selection.ranges.map((range, index) => {
    if (range.empty) {
      const previous = transaction.startState.selection.ranges[index]?.head ?? range.head;
      const separator = boundariesAt(state, range.head).some(value => value.kind === "separator");
      const direction = !transaction.docChanged && (navigation || separator) ? Math.sign(range.head - previous) as -1 | 0 | 1 : 0;
      return editingCursor(state, range, direction);
    }
    // A fully selected owner remains removable, including select-all. Partial
    // endpoints are normalized without reversing or collapsing the selection.
    const endpoint = (position: number, side: -1 | 1): number => {
      if (boundariesAt(state, position).some(value => range.from <= (value.selectFrom ?? value.from) && range.to >= (value.selectTo ?? value.to))) return position;
      return editingCursor(state, EditorSelection.cursor(position), side, false).head;
    };
    const from = endpoint(range.from, -1), to = endpoint(range.to, 1);
    return from === range.from && to === range.to ? range : EditorSelection.range(range.anchor === range.from ? from : to, range.head === range.to ? to : from);
  });
  return ranges.every((range, index) => range === selection.ranges[index]) ? null : EditorSelection.create(ranges, selection.mainIndex);
}
