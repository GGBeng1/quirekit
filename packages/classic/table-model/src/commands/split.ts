import type { Node as PMNode } from "@quirekit/pm";
import {
  createWordTableMap,
  getRangeEndColumn,
  getRectEndRow,
  type WordTableMap,
  type WordTableSemanticCellRef,
} from "../map";
import { splitSemanticCell } from "./derive/split/plan";
import { prepareWordTableCommand } from "./repair";
import type {
  SplitWordTableCellOptions,
  WordTableCommandResult,
} from "./types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess,
} from "./types";

/**
 * Splits one semantic Word table cell back into explicit grid cells.
 *
 * @param tableNode - Source table node.
 * @param options - Split options.
 * @returns Command result containing the updated table node.
 */
export function splitWordTableCell(
  tableNode: PMNode,
  options: SplitWordTableCellOptions
): WordTableCommandResult<PMNode> {
  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  const sourceTable = prepared.value.tableNode;
  const map = createWordTableMap(sourceTable);

  if (
    options.rowIndex < 0 ||
    options.columnIndex < 0 ||
    options.rowIndex >= map.height ||
    options.columnIndex >= map.width
  ) {
    return wordTableCommandFailure("invalid-selection");
  }

  const semanticCell = map.cellAt(options.rowIndex, options.columnIndex);

  if (!semanticCell) {
    return wordTableCommandFailure("invalid-selection");
  }

  const rowCount = options.rowCount ?? semanticCell.rect.rowSpan;
  const columnCount = options.columnCount ?? semanticCell.rect.columnSpan;

  if (
    rowCount < semanticCell.rect.rowSpan ||
    columnCount < semanticCell.rect.columnSpan ||
    rowCount <= 0 ||
    columnCount <= 0
  ) {
    return wordTableCommandFailure("unsupported-merge");
  }

  if (rowCount === 1 && columnCount === 1) {
    return wordTableCommandSuccess(sourceTable, prepared.value.repair);
  }

  if (!semanticCellContainsOnlyCells(map, semanticCell)) {
    return wordTableCommandFailure("unsupported-merge");
  }

  const splitTable = splitSemanticCell(sourceTable, map, semanticCell, {
    rowCount,
    columnCount,
  });

  return splitTable
    ? wordTableCommandSuccess(splitTable, prepared.value.repair)
    : wordTableCommandFailure("unsupported-merge");
}
/**
 * Checks whether every slot covered by a semantic cell is a cell slot.
 *
 * @param map - Derived table map.
 * @param semanticCell - Semantic cell to inspect.
 * @returns Whether every covered slot is cell-backed.
 */
function semanticCellContainsOnlyCells(
  map: WordTableMap,
  semanticCell: WordTableSemanticCellRef
): boolean {
  for (
    let row = semanticCell.rect.startRow;
    row < getRectEndRow(semanticCell.rect);
    row += 1
  ) {
    for (
      let column = semanticCell.rect.startColumn;
      column < getRangeEndColumn(semanticCell.rect);
      column += 1
    ) {
      if (map.slotAt(row, column)?.kind !== "cell") {
        return false;
      }
    }
  }

  return true;
}
