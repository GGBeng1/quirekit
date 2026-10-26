import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap, type WordTableMap } from "../map";
import { getRectEndRow } from "../map/range";
import {
  createFullWidthRowAt,
  createRowFromAdjacentShape
} from "./derive/row/create";
import { cloneTableWithRows } from "./derive/node/clone";
import {
  getMoveRangeInsertionIndex,
  isMoveRangeNoop
} from "./derive/shared/move-range";
import {
  prepareWordTableCommand,
  repairWordTableVerticalMerges
} from "./repair";
import type {
  AddWordTableRowOptions,
  DeleteWordTableRowsOptions,
  MoveWordTableRowsOptions,
  WordTableCommandResult,
  WordTableMaybeDeleted
} from "./types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess,
  withWordTableRepairReport
} from "./types";

/**
 * Adds a row before or after an existing source row.
 *
 * @param tableNode - Source table node.
 * @param options - Row insertion options.
 * @returns Command result containing the updated table node.
 */
export function addWordTableRow(
  tableNode: PMNode,
  options: AddWordTableRowOptions
): WordTableCommandResult<PMNode> {
  if (options.rowIndex < 0 || options.rowIndex >= tableNode.childCount) {
    return wordTableCommandFailure("invalid-selection");
  }

  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  const sourceTable = prepared.value.tableNode;
  const map = createWordTableMap(sourceTable);

  const insertRowIndex = options.side === "before"
    ? options.rowIndex
    : options.rowIndex + 1;
  const rows = [...sourceTable.children];
  const newRow = options.copyRowShape
    ? createRowFromAdjacentShape(sourceTable, options.rowIndex)
    : createFullWidthRowAt(sourceTable, map, insertRowIndex);

  rows.splice(insertRowIndex, 0, newRow);

  return withWordTableRepairReport(
    repairWordTableVerticalMerges(
      cloneTableWithRows(sourceTable, {}, rows)
    ),
    prepared.value.repair
  );
}

/**
 * Deletes an inclusive row range.
 *
 * @param tableNode - Source table node.
 * @param options - Row deletion options.
 * @returns Command result containing the updated table node, or null when the table is deleted.
 */
export function deleteWordTableRows(
  tableNode: PMNode,
  options: DeleteWordTableRowsOptions
): WordTableCommandResult<WordTableMaybeDeleted> {
  const from = options.from;
  const to = options.to ?? from;

  if (from < 0 || to < from || to >= tableNode.childCount) {
    return wordTableCommandFailure("invalid-selection");
  }

  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  const sourceTable = prepared.value.tableNode;

  const rows = sourceTable.children.filter((_row, index) =>
    index < from || index > to
  );

  if (rows.length === 0) {
    return wordTableCommandSuccess(null, prepared.value.repair);
  }

  return withWordTableRepairReport(
    repairWordTableVerticalMerges(
      cloneTableWithRows(sourceTable, {}, rows)
    ),
    prepared.value.repair
  );
}

/**
 * Moves an inclusive row range to a source-table row boundary.
 *
 * @param tableNode - Source table node.
 * @param options - Row move options.
 * @returns Command result containing the updated table node.
 */
export function moveWordTableRows(
  tableNode: PMNode,
  options: MoveWordTableRowsOptions
): WordTableCommandResult<PMNode> {
  const from = options.from;
  const to = options.to ?? from;

  if (
    from < 0 ||
    to < from ||
    to >= tableNode.childCount ||
    options.targetIndex < 0 ||
    options.targetIndex > tableNode.childCount
  ) {
    return wordTableCommandFailure("invalid-selection");
  }

  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  const sourceTable = prepared.value.tableNode;
  const map = createWordTableMap(sourceTable);

  if (isMoveRangeNoop(from, to, options.targetIndex)) {
    return wordTableCommandSuccess(sourceTable, prepared.value.repair);
  }

  if (!canMoveRowsWithoutSplitting(map, from, to)) {
    return wordTableCommandFailure("unsupported-merge");
  }

  const rows = [...sourceTable.children];
  const movedRows = rows.splice(from, to - from + 1);
  const insertIndex = getMoveRangeInsertionIndex(from, to, options.targetIndex);

  rows.splice(insertIndex, 0, ...movedRows);

  return withWordTableRepairReport(
    repairWordTableVerticalMerges(
      cloneTableWithRows(sourceTable, {}, rows)
    ),
    prepared.value.repair
  );
}

/**
 * Checks whether a row move keeps every semantic cell complete.
 *
 * @param map - Derived table map.
 * @param from - First moved row index.
 * @param to - Last moved row index.
 * @returns Whether no semantic cell is partially moved.
 */
function canMoveRowsWithoutSplitting(
  map: WordTableMap,
  from: number,
  to: number
): boolean {
  return map.semanticCells.every((cell) => {
    const endRow = getRectEndRow(cell.rect);
    const intersects = cell.rect.startRow <= to && endRow > from;
    const contained = cell.rect.startRow >= from && endRow <= to + 1;

    return !intersects || contained;
  });
}
