import type {
  QuireTableCellGeometry,
  QuireTableGeometrySnapshot
} from "../types";

/**
 * Resolves visible cell-edge bounds for outside-border classification.
 *
 * @param snapshot - Table snapshot containing page-local cells and rows.
 * @param cell - Cell whose edge should be classified.
 * @returns Visible bounds used for the cell's outside-edge checks.
 */
export function resolveVisibleQuireTableCellEdgeBounds(
  snapshot: QuireTableGeometrySnapshot,
  cell: QuireTableCellGeometry
): {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
} {
  const allCellBounds = unionTableCellRects(snapshot.cells);
  const rowLocalCells = snapshot.cells.filter((candidate) =>
    doTableCellsCoverAnySharedRow(cell, candidate)
  );
  const rowLocalBounds = unionTableCellRects(
    rowLocalCells.length > 0 ? rowLocalCells : snapshot.cells
  );

  return {
    top: allCellBounds.top,
    right: rowLocalBounds.right,
    bottom: allCellBounds.bottom,
    left: rowLocalBounds.left
  };
}

/**
 * Computes physical edge bounds for a group of visible table cells.
 *
 * @param cells - Cell fragments to union.
 * @returns Edge bounds for the supplied cells.
 */
function unionTableCellRects(
  cells: readonly QuireTableCellGeometry[]
): {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
} {
  if (cells.length === 0) {
    return {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };
  }

  return {
    top: Math.min(...cells.map((cell) => cell.rect.y)),
    right: Math.max(...cells.map((cell) => cell.rect.x + cell.rect.width)),
    bottom: Math.max(...cells.map((cell) => cell.rect.y + cell.rect.height)),
    left: Math.min(...cells.map((cell) => cell.rect.x))
  };
}

/**
 * Checks whether two table cells visually cover at least one source row.
 *
 * @param left - First cell fragment.
 * @param right - Second cell fragment.
 * @returns Whether the cells share any source row index.
 */
function doTableCellsCoverAnySharedRow(
  left: QuireTableCellGeometry,
  right: QuireTableCellGeometry
): boolean {
  const leftStart = left.gridRect.startRow;
  const leftEnd = left.gridRect.startRow + left.gridRect.rowSpan;
  const rightStart = right.gridRect.startRow;
  const rightEnd = right.gridRect.startRow + right.gridRect.rowSpan;

  return leftStart < rightEnd && rightStart < leftEnd;
}
