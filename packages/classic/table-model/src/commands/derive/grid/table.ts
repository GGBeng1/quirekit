import { getMoveRangeInsertionIndex } from "../shared/move-range";

/**
 * Inserts one table grid entry.
 *
 * @param grid - Existing table grid attr.
 * @param width - Current table width.
 * @param insertColumn - Grid column to insert.
 * @returns Updated table grid.
 */
export function insertGridColumn(
  grid: unknown,
  width: number,
  insertColumn: number
): readonly unknown[] {
  const columns = createGridColumns(grid, width);

  columns.splice(insertColumn, 0, { width: null });

  return columns;
}

/**
 * Deletes one table grid entry.
 *
 * @param grid - Existing table grid attr.
 * @param width - Current table width.
 * @param deleteColumn - Grid column to delete.
 * @returns Updated table grid.
 */
export function deleteGridColumn(
  grid: unknown,
  width: number,
  deleteColumn: number
): readonly unknown[] {
  const columns = createGridColumns(grid, width);

  columns.splice(deleteColumn, 1);

  return columns;
}

/**
 * Moves one table grid column range.
 *
 * @param grid - Existing table grid attr.
 * @param width - Current table width.
 * @param from - First grid column index to move.
 * @param to - Last grid column index to move, inclusive.
 * @param targetIndex - Source-table grid boundary before which to insert.
 * @returns Updated table grid.
 */
export function moveGridColumns(
  grid: unknown,
  width: number,
  from: number,
  to: number,
  targetIndex: number
): readonly unknown[] {
  const columns = createGridColumns(grid, width);
  const movedColumns = columns.splice(from, to - from + 1);
  const insertIndex = getMoveRangeInsertionIndex(from, to, targetIndex);

  columns.splice(insertIndex, 0, ...movedColumns);

  return columns;
}

/**
 * Creates a mutable table grid array with at least the requested width.
 *
 * @param grid - Existing table grid attr.
 * @param width - Current table width.
 * @returns Mutable grid column array.
 */
function createGridColumns(grid: unknown, width: number): unknown[] {
  const columns = Array.isArray(grid)
    ? [...grid]
    : [];

  while (columns.length < width) {
    columns.push({ width: null });
  }

  return columns;
}
