import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap } from "../map";
import {
  addColumnToRow,
  canMoveColumnsWithoutSplitting,
  deleteColumnFromRow,
  moveColumnsInRow
} from "./derive/column/row";
import {
  getMoveRangeInsertionIndex,
  isMoveRangeNoop
} from "./derive/shared/move-range";
import { cloneTableWithRows } from "./derive/node/clone";
import {
  deleteGridColumn,
  insertGridColumn,
  moveGridColumns
} from "./derive/grid/table";
import type {
  AddWordTableColumnOptions,
  DeleteWordTableColumnsOptions,
  MoveWordTableColumnsOptions,
  WordTableCommandResult,
  WordTableMaybeDeleted
} from "./types";
import {
  prepareWordTableCommand
} from "./repair";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess,
  withWordTableRepairReport
} from "./types";

/**
 * Adds a Word grid column before or after a target column.
 *
 * @param tableNode - Source table node.
 * @param options - Column insertion options.
 * @returns Command result containing the updated table node.
 */
export function addWordTableColumn(
  tableNode: PMNode,
  options: AddWordTableColumnOptions
): WordTableCommandResult<PMNode> {
  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  const sourceTable = prepared.value.tableNode;
  const map = createWordTableMap(sourceTable);
  const insertColumn = options.side === "before"
    ? options.columnIndex
    : options.columnIndex + 1;

  if (insertColumn < 0 || insertColumn > map.width) {
    return wordTableCommandFailure("invalid-selection");
  }

  const rows = sourceTable.children.map((row) =>
    addColumnToRow(sourceTable, row, insertColumn)
  );

  return wordTableCommandSuccess(cloneTableWithRows(sourceTable, {
    grid: insertGridColumn(sourceTable.attrs.grid, map.width, insertColumn)
  }, rows), prepared.value.repair);
}

/**
 * Deletes an inclusive Word grid column range.
 *
 * @param tableNode - Source table node.
 * @param options - Column deletion options.
 * @returns Command result containing the updated table node, or null when the table is deleted.
 */
export function deleteWordTableColumns(
  tableNode: PMNode,
  options: DeleteWordTableColumnsOptions
): WordTableCommandResult<WordTableMaybeDeleted> {
  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  const sourceTable = prepared.value.tableNode;
  const map = createWordTableMap(sourceTable);
  const from = options.from;
  const to = options.to ?? from;

  if (from < 0 || to < from || to >= map.width) {
    return wordTableCommandFailure("invalid-selection");
  }

  if (to - from + 1 >= map.width) {
    return wordTableCommandSuccess(null, prepared.value.repair);
  }

  let current = sourceTable;

  for (let column = to; column >= from; column -= 1) {
    const currentMap = createWordTableMap(current);
    const rows = current.children.map((row) =>
      deleteColumnFromRow(current, row, column)
    );

    current = cloneTableWithRows(current, {
      grid: deleteGridColumn(current.attrs.grid, currentMap.width, column)
    }, rows);
  }

  return wordTableCommandSuccess(current, prepared.value.repair);
}

/**
 * Moves an inclusive Word grid column range to a source-table grid boundary.
 *
 * @param tableNode - Source table node.
 * @param options - Column move options.
 * @returns Command result containing the updated table node.
 */
export function moveWordTableColumns(
  tableNode: PMNode,
  options: MoveWordTableColumnsOptions
): WordTableCommandResult<PMNode> {
  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  const sourceTable = prepared.value.tableNode;
  const map = createWordTableMap(sourceTable);
  const from = options.from;
  const to = options.to ?? from;

  if (
    from < 0 ||
    to < from ||
    to >= map.width ||
    options.targetIndex < 0 ||
    options.targetIndex > map.width
  ) {
    return wordTableCommandFailure("invalid-selection");
  }

  if (isMoveRangeNoop(from, to, options.targetIndex)) {
    return wordTableCommandSuccess(sourceTable, prepared.value.repair);
  }

  if (!canMoveColumnsWithoutSplitting(sourceTable, map.width)) {
    return wordTableCommandFailure("unsupported-merge");
  }

  const insertIndex = getMoveRangeInsertionIndex(from, to, options.targetIndex);
  const rows = sourceTable.children.map((row) =>
    moveColumnsInRow(row, from, to, insertIndex)
  );

  return withWordTableRepairReport(
    wordTableCommandSuccess(cloneTableWithRows(sourceTable, {
      grid: moveGridColumns(
        sourceTable.attrs.grid,
        map.width,
        from,
        to,
        options.targetIndex
      )
    }, rows)),
    prepared.value.repair
  );
}
