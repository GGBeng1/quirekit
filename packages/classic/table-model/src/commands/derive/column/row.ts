import type { Node as PMNode } from "@quirekit/pm";
import {
  readWordTableCellSpan,
  readWordTableRowOffset
} from "../grid/ranges";
import {
  cloneCellWithAttrs,
  cloneRowWithAttrs
} from "../node/clone";
import {
  createEmptyWordTableCellNode,
  getWordTableCommandNodeTypesFromTable
} from "../node/builder";

/**
 * Adds one column to a row.
 *
 * @param tableNode - Source table node used for creating new cells.
 * @param row - Row to update.
 * @param insertColumn - Grid column to insert.
 * @returns Updated row.
 */
export function addColumnToRow(
  tableNode: PMNode,
  row: PMNode,
  insertColumn: number
): PMNode {
  const nodeTypes = getWordTableCommandNodeTypesFromTable(tableNode);
  const gridBefore = readWordTableRowOffset(row, "gridBefore");
  const gridAfter = readWordTableRowOffset(row, "gridAfter");

  if (insertColumn < gridBefore) {
    return cloneRowWithAttrs(row, { gridBefore: gridBefore + 1 });
  }

  const cells: PMNode[] = [];
  let column = gridBefore;
  let inserted = false;

  for (const cell of row.children) {
    const span = readWordTableCellSpan(cell);
    const endColumn = column + span;

    if (!inserted && insertColumn === column) {
      cells.push(createEmptyWordTableCellNode(nodeTypes));
      inserted = true;
    }

    if (!inserted && insertColumn > column && insertColumn < endColumn) {
      cells.push(cloneCellWithAttrs(cell, {
        colspan: span + 1,
        gridSpan: span + 1
      }));
      inserted = true;
    } else {
      cells.push(cell);
    }

    column = endColumn;
  }

  if (!inserted) {
    if (insertColumn >= column && insertColumn < column + gridAfter) {
      return cloneRowWithAttrs(row, { gridAfter: gridAfter + 1 }, cells);
    }

    cells.push(createEmptyWordTableCellNode(nodeTypes));
  }

  return cloneRowWithAttrs(row, {}, cells);
}

/**
 * Deletes one column from a row.
 *
 * @param tableNode - Source table node used for creating fallback cells.
 * @param row - Row to update.
 * @param deleteColumn - Grid column to delete.
 * @returns Updated row.
 */
export function deleteColumnFromRow(
  tableNode: PMNode,
  row: PMNode,
  deleteColumn: number
): PMNode {
  const nodeTypes = getWordTableCommandNodeTypesFromTable(tableNode);
  const gridBefore = readWordTableRowOffset(row, "gridBefore");
  const gridAfter = readWordTableRowOffset(row, "gridAfter");

  if (deleteColumn < gridBefore) {
    return cloneRowWithAttrs(row, { gridBefore: gridBefore - 1 });
  }

  const cells: PMNode[] = [];
  let column = gridBefore;
  let deleted = false;

  for (const cell of row.children) {
    const span = readWordTableCellSpan(cell);
    const endColumn = column + span;

    if (!deleted && deleteColumn >= column && deleteColumn < endColumn) {
      if (span > 1) {
        cells.push(cloneCellWithAttrs(cell, {
          colspan: span - 1,
          gridSpan: span - 1
        }));
      }

      deleted = true;
    } else {
      cells.push(cell);
    }

    column = endColumn;
  }

  if (!deleted && deleteColumn >= column && deleteColumn < column + gridAfter) {
    return cloneRowWithAttrs(row, { gridAfter: gridAfter - 1 }, cells);
  }

  return cloneRowWithAttrs(
    row,
    {},
    cells.length > 0 ? cells : [createEmptyWordTableCellNode(nodeTypes)]
  );
}

/**
 * Checks whether columns can be moved without splitting spans or offsets.
 *
 * @param tableNode - Source table node.
 * @param width - Canonical table width.
 * @returns Whether every row has explicit unit-span cells for the full width.
 */
export function canMoveColumnsWithoutSplitting(
  tableNode: PMNode,
  width: number
): boolean {
  return tableNode.children.every((row) =>
    readWordTableRowOffset(row, "gridBefore") === 0 &&
    readWordTableRowOffset(row, "gridAfter") === 0 &&
    row.childCount === width &&
    row.children.every((cell) => readWordTableCellSpan(cell) === 1)
  );
}

/**
 * Moves explicit unit-span cells inside one row.
 *
 * @param row - Source row.
 * @param from - First cell index to move.
 * @param to - Last cell index to move, inclusive.
 * @param insertIndex - Insertion index after the moved range has been removed.
 * @returns Updated row.
 */
export function moveColumnsInRow(
  row: PMNode,
  from: number,
  to: number,
  insertIndex: number
): PMNode {
  const cells = [...row.children];
  const movedCells = cells.splice(from, to - from + 1);

  cells.splice(insertIndex, 0, ...movedCells);

  return cloneRowWithAttrs(row, {}, cells);
}
