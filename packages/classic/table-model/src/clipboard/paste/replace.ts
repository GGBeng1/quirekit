import type { Slice, Transaction } from "@quirekit/pm";
import { createWordTableMap } from "../../map";
import type { WordTableSelection } from "../../selection/selection";
import type { WordTableSelectionCreateOptions } from "../../selection/types";
import { planTablePaste } from "./plan";

/**
 * Applies the PM selection replacement shared by all clipboard MIME paths.
 * @param selection - Current structural selection.
 * @param tr - Shared paste transaction.
 * @param slice - Parsed and resource-remapped source.
 * @returns Fresh selection options on success, true on rejection, or false for other content.
 */
export function pasteWordTableSelection(selection: WordTableSelection, tr: Transaction, slice: Slice): boolean | WordTableSelectionCreateOptions {
  const source = slice.content.firstChild;
  if (slice.openStart || slice.openEnd || slice.content.childCount !== 1 || source?.type.name !== "wordTable") return false;
  const target = tr.doc.nodeAt(selection.tablePos);
  const plan = target?.type.name === "wordTable"
    ? planTablePaste(target, source, selection.rect) : { reason: "invalid-target" };
  if ("reason" in plan) {
    tr.setMeta("preventDispatch", true);
    tr.setMeta("quirekit:word-table-paste", { status: "rejected", reason: plan.reason });
    return true;
  }
  // Granular body edits preserve mappings for comments and protected outside cells.
  if (plan.edits) {
    const start = tr.mapping.maps.length;
    for (const edit of plan.edits) {
      const pos = tr.mapping.slice(start).map(selection.tablePos + edit.cellPos);
      tr.replaceWith(pos + 1, pos + 1 + edit.size, edit.content);
    }
  } else {
    tr.replaceWith(selection.tablePos, selection.tablePos + target!.nodeSize, plan.table);
  }
  const sourceMap = createWordTableMap(source);
  const map = createWordTableMap(tr.doc.nodeAt(selection.tablePos)!);
  tr.setMeta("quirekit:word-table-paste", { status: "applied", expanded: plan.edits === null,
    rowCount: sourceMap.height, columnCount: sourceMap.width, containerFormatting: "target" });
  return {
    tablePos: selection.tablePos,
    anchorCellPos: map.positionAt(selection.rect.startRow, selection.rect.startColumn)!,
    headCellPos: map.positionAt(selection.rect.startRow + sourceMap.height - 1, selection.rect.startColumn + sourceMap.width - 1)!,
    mode: "cell"
  };
}
