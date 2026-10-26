import type { Selection } from "@quirekit/pm";
import { createWordTableMap, type WordTableGridRect } from "../../../../../map";
import { WordTableSelection } from "../../../../../selection";
import type { MergeWordTableCellsCommandOptions, SplitWordTableCellCommandOptions, WordTableEditorLocateOptions } from "../../../../types";
import type { TableTransformSelectionContext } from "../../types";

/** @param context - Completed merge. @returns Result-cell selection for an existing structural target. */
export function selectMergedWordTableCell(context: TableTransformSelectionContext<MergeWordTableCellsCommandOptions>): Selection | null {
  return selectResultRect(context, { startRow: context.options.startRow, startColumn: context.options.startColumn, rowSpan: 1, columnSpan: 1 });
}

/** @param context - Completed split. @returns Output rectangle selection for an existing structural target. */
export function selectSplitWordTableCells(context: TableTransformSelectionContext<SplitWordTableCellCommandOptions>): Selection | null {
  if (!(context.selection instanceof WordTableSelection) || context.selection.tablePos !== context.tablePos) return null;
  const cell = createWordTableMap(context.previousTable).cellAt(context.options.rowIndex, context.options.columnIndex);
  if (!cell) return null;
  return selectResultRect(context, {
    ...cell.rect,
    rowSpan: context.options.rowCount ?? cell.rect.rowSpan,
    columnSpan: context.options.columnCount ?? cell.rect.columnSpan
  });
}

/**
 * Reanchors semantic selections after a whole-table replacement changed PM offsets.
 *
 * @param context - Transaction-local source and destination tables.
 * @param rect - Result coverage in source grid coordinates, never screen coordinates.
 * @returns Fresh selection, or null when the caller had no structural target here.
 */
function selectResultRect(context: TableTransformSelectionContext<WordTableEditorLocateOptions>, rect: WordTableGridRect): Selection | null {
  if (!(context.selection instanceof WordTableSelection) || context.selection.tablePos !== context.tablePos) return null;
  const map = createWordTableMap(context.nextTable);
  const anchorCellPos = map.positionAt(rect.startRow, rect.startColumn);
  const headCellPos = map.positionAt(rect.startRow + rect.rowSpan - 1, rect.startColumn + rect.columnSpan - 1);
  if (anchorCellPos === null || headCellPos === null) return null;
  return WordTableSelection.create(context.tr.doc, { tablePos: context.tablePos, anchorCellPos, headCellPos, mode: "cell" });
}
