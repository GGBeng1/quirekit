import type {
  QuireTableCellFragment,
  QuireTableRowFragment
} from "../../../table";
import type { QuireSourceFlowClip } from "../source-flow";

/**
 * Finds row fragments whose row indexes are covered by a table cell.
 *
 * @param cell - Cell fragment whose row span should be inspected.
 * @param rows - Candidate table rows.
 * @returns Rows covered by the cell's source grid rectangle.
 */
export function filterQuireTableRowsCoveredByCell(
  cell: QuireTableCellFragment,
  rows: readonly QuireTableRowFragment[]
): readonly QuireTableRowFragment[] {
  return rows.filter((row) =>
    doesQuireTableCellCoverRowIndex(cell, row.rowIndex)
  );
}

/**
 * Checks whether a cell covers at least one row index.
 *
 * @param cell - Cell fragment whose row span should be inspected.
 * @param rowIndexes - Row indexes to test.
 * @returns Whether any row index is inside the cell's source grid rectangle.
 */
export function doesQuireTableCellCoverAnyRowIndex(
  cell: QuireTableCellFragment,
  rowIndexes: Iterable<number>
): boolean {
  for (const rowIndex of rowIndexes) {
    if (doesQuireTableCellCoverRowIndex(cell, rowIndex)) {
      return true;
    }
  }

  return false;
}

/**
 * Creates the source-flow band covered by table row fragments.
 *
 * @param rows - Row fragments that should form one vertical band.
 * @returns Source-flow band spanning the rows, or null when no rows exist.
 */
export function createQuireTableRowsFlowClip(
  rows: readonly QuireTableRowFragment[]
): QuireSourceFlowClip | null {
  if (rows.length === 0) {
    return null;
  }

  return {
    top: Math.min(...rows.map((row) => row.rect.y)),
    bottom: Math.max(...rows.map((row) => row.rect.y + row.rect.height))
  };
}

/**
 * Checks whether a cell's source grid rectangle covers one row index.
 *
 * @param cell - Cell fragment to inspect.
 * @param rowIndex - Source row index to test.
 * @returns Whether the row is inside the cell row span.
 */
function doesQuireTableCellCoverRowIndex(
  cell: QuireTableCellFragment,
  rowIndex: number
): boolean {
  return cell.gridRect.startRow <= rowIndex &&
    rowIndex < cell.gridRect.startRow + cell.gridRect.rowSpan;
}
