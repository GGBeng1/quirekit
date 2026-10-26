import type { QuireTableSize, TableGridKey } from "./types";

/** Fixed quick-grid dimensions matching the admitted desktop interaction. */
export const tableQuickGridSize: QuireTableSize = Object.freeze({
  rowCount: 8,
  columnCount: 10
});

/**
 * Reports whether one grid cell belongs to the active rectangular selection.
 *
 * @param cell - One-based cell coordinates.
 * @param active - One-based active rectangle endpoint.
 * @returns Whether the cell is inside the highlighted rectangle.
 */
export function isTableGridCellHighlighted(
  cell: QuireTableSize,
  active: QuireTableSize
): boolean {
  return cell.rowCount <= active.rowCount
    && cell.columnCount <= active.columnCount;
}

/**
 * Moves one quick-grid tuple while preserving the admitted grid bounds.
 *
 * @param selection - Current one-based selection tuple.
 * @param key - Navigation key to interpret.
 * @param accelerated - Whether Home or End jumps across both axes.
 * @returns New clamped selection tuple.
 */
export function moveTableGridSelection(
  selection: QuireTableSize,
  key: TableGridKey,
  accelerated = false
): QuireTableSize {
  const current = clampTableGridSelection(selection);
  if (accelerated && key === "Home") return { rowCount: 1, columnCount: 1 };
  if (accelerated && key === "End") return tableQuickGridSize;

  switch (key) {
    case "ArrowDown":
      return clampTableGridSelection({
        ...current,
        rowCount: current.rowCount + 1
      });
    case "ArrowLeft":
      return clampTableGridSelection({
        ...current,
        columnCount: current.columnCount - 1
      });
    case "ArrowRight":
      return clampTableGridSelection({
        ...current,
        columnCount: current.columnCount + 1
      });
    case "ArrowUp":
      return clampTableGridSelection({
        ...current,
        rowCount: current.rowCount - 1
      });
    case "End":
      return { ...current, columnCount: tableQuickGridSize.columnCount };
    case "Home":
      return { ...current, columnCount: 1 };
  }
}

/**
 * Normalizes one pair of custom-size input drafts.
 *
 * @param rowCount - Draft row count.
 * @param columnCount - Draft column count.
 * @param maximum - Largest accepted dimension.
 * @returns Complete validated tuple, or null when either draft is invalid.
 */
export function normalizeTableSize(
  rowCount: number | null,
  columnCount: number | null,
  maximum = 63
): QuireTableSize | null {
  return isDimension(rowCount, maximum)
    && isDimension(columnCount, maximum)
    ? { rowCount, columnCount }
    : null;
}

/**
 * Clamps arbitrary numeric coordinates to the fixed quick-grid rectangle.
 *
 * @param selection - Candidate row/column tuple.
 * @returns Tuple inside the one-based quick-grid bounds.
 */
function clampTableGridSelection(
  selection: QuireTableSize
): QuireTableSize {
  return {
    rowCount: Math.min(
      Math.max(1, selection.rowCount),
      tableQuickGridSize.rowCount
    ),
    columnCount: Math.min(
      Math.max(1, selection.columnCount),
      tableQuickGridSize.columnCount
    )
  };
}

/** @param value - Draft dimension. @param maximum - Inclusive bound. @returns Whether the draft is admissible. */
function isDimension(value: number | null, maximum: number): value is number {
  return value !== null && Number.isInteger(value) && value >= 1 && value <= maximum;
}
