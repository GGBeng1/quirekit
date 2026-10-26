import { Slice, TextSelection, type Selection, type Transaction } from "@quirekit/pm";
import { WordTableSelection } from "../../selection/selection";
import type { WordTableSelectionCreateOptions } from "../../selection/types";

/** @param selection - Current selection. @returns Nearest cell target for a collapsed text caret only. */
export function resolveTablePasteCaret(selection: Selection): WordTableSelectionCreateOptions | null {
  if (!(selection instanceof TextSelection) || !selection.empty) return null;
  const { $from } = selection;
  for (let depth = $from.depth; depth > 1; depth -= 1) {
    if ($from.node(depth).type.name !== "wordTableCell") continue;
    if ($from.node(depth - 1).type.name !== "wordTableRow" || $from.node(depth - 2).type.name !== "wordTable") return null;
    const tablePos = $from.before(depth - 2);
    const cellPos = $from.before(depth) - tablePos;
    return { tablePos, anchorCellPos: cellPos, headCellPos: cellPos };
  }
  return null;
}

/**
 * Adapts a cell caret to the existing structural replacement inside Input's transaction.
 * @param tr - Input-owned, resource-compatible transaction.
 * @param slice - Complete source table; other sources retain normal text behavior.
 * @returns Whether this adapter consumed the paste.
 */
export function prepareTableCaretPaste(tr: Transaction, slice: Slice): boolean {
  if (slice.content.childCount !== 1 || slice.content.firstChild?.type.name !== "wordTable") return false;
  const target = resolveTablePasteCaret(tr.selection);
  if (!target) return false;
  const original = tr.selection;
  tr.setSelection(WordTableSelection.create(tr.doc, target));
  tr.replaceSelection(new Slice(slice.content, 0, 0));
  if (tr.getMeta("preventDispatch") === true) tr.setSelection(original);
  return true;
}
