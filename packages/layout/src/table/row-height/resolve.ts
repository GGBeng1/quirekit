import { resolveQuireTableRowLineAllowance } from "../border/occupancy/lines";
import { resolveQuireTableRowHeightFloor } from "../metrics";
import { resolveMeasuredCellOuterHeight } from "./measurement";
import type {
  QuireTableCellContentLayout,
  QuireTableGridTrack,
  QuireTableLayoutInput,
  QuireTableSourceCell,
  QuireTableSourceRow
} from "../types";
import { createQuireTableBaseRowHeightSignature } from "./signature";

/**
 * Resolves row heights from measured cell content and merged-cell spans.
 *
 * @param input - Table source and layout constraints.
 * @param measuredCells - Measured content layouts keyed by semantic cell id.
 * @param tracksByRow - Resolved physical tracks for each row.
 * @returns Row heights in source row order.
 */
export function resolveQuireTableRowHeights(
  input: QuireTableLayoutInput,
  measuredCells: ReadonlyMap<string, QuireTableCellContentLayout>,
  tracksByRow: readonly (readonly QuireTableGridTrack[])[]
): readonly number[] {
  const rowHeights = input.source.rows.map((row) =>
    resolveBaseRowHeight(input, measuredCells, tracksByRow, row)
  );

  for (const cell of input.source.semanticCells) {
    growCoveredAutomaticRowForSpanningCell(input, measuredCells, tracksByRow, rowHeights, cell);
  }

  return rowHeights;
}

/**
 * Resolves the natural height for one row before row-spanning redistribution.
 *
 * @param input - Table source and layout constraints.
 * @param measuredCells - Measured content layouts keyed by semantic cell id.
 * @param tracksByRow - Resolved physical table tracks for each source row.
 * @param row - Source row whose base height should be resolved.
 * @returns Base row height in CSS pixels.
 */
function resolveBaseRowHeight(
  input: QuireTableLayoutInput,
  measuredCells: ReadonlyMap<string, QuireTableCellContentLayout>,
  tracksByRow: readonly (readonly QuireTableGridTrack[])[],
  row: QuireTableSourceRow
): number {
  const rowCells = input.source.semanticCells
    .filter((cell) =>
      cell.gridRect.startRow === row.rowIndex &&
      Math.max(1, cell.gridRect.rowSpan) === 1
    );
  const resolve = () => {
    const measuredCellHeights = rowCells.map((cell) =>
      resolveMeasuredCellOuterHeight(input, measuredCells, tracksByRow, cell)
    );
    const preferredHeight = resolveQuireTableRowHeightFloor(row.height);
    const lines = resolveQuireTableRowLineAllowance(input, row.rowIndex);

    // A declared size overrides the authoring preset. Only automatic rows
    // inherit its floor; exact rows retain content solely behind their clip.
    // An exact height includes the line above the row and an at-least height
    // excludes it; the table's bottom edge always adds below the last row.
    if (row.height?.rule === "exact" && preferredHeight !== null) {
      return preferredHeight + lines.bottom;
    }
    const automaticFloor = input.source.contentSizedRows === true ? 0 : input.constraints.defaultRowHeight;
    const floor = preferredHeight === null ? automaticFloor : preferredHeight + lines.top + lines.bottom;
    return Math.max(0, floor, ...measuredCellHeights);
  };
  const retainedResolver = input.resolveBaseRowHeight;
  if (retainedResolver === undefined) {
    return resolve();
  }

  return retainedResolver({
    rowIndex: row.rowIndex,
    dependencySignature: createQuireTableBaseRowHeightSignature(
      input,
      row,
      rowCells,
      measuredCells,
      tracksByRow[row.rowIndex] ?? []
    ),
    resolve
  });
}

/**
 * Grows the last non-exact covered row when a spanning cell needs more height.
 *
 * @param input - Table source and layout constraints.
 * @param measuredCells - Measured content layouts keyed by semantic cell id.
 * @param tracksByRow - Resolved physical table tracks for each source row.
 * @param rowHeights - Mutable row heights in source row order.
 * @param cell - Source cell that may span multiple rows.
 */
function growCoveredAutomaticRowForSpanningCell(
  input: QuireTableLayoutInput,
  measuredCells: ReadonlyMap<string, QuireTableCellContentLayout>,
  tracksByRow: readonly (readonly QuireTableGridTrack[])[],
  rowHeights: number[],
  cell: QuireTableSourceCell
): void {
  const rowSpan = Math.max(1, cell.gridRect.rowSpan);

  if (rowSpan === 1) {
    return;
  }

  const startRow = cell.gridRect.startRow;
  const endRow = Math.min(rowHeights.length, startRow + rowSpan);

  if (startRow < 0 || startRow >= endRow) {
    return;
  }

  const coveredHeight = rowHeights
    .slice(startRow, endRow)
    .reduce((total, height) => total + height, 0);
  const requiredHeight = resolveMeasuredCellOuterHeight(
    input,
    measuredCells,
    tracksByRow,
    cell
  );
  const extraHeight = requiredHeight - coveredHeight;
  // Merged content cannot override a fixed row. Search within this span only;
  // when every covered row is exact, the cell's existing clip owns overflow.
  if (extraHeight <= 0) return;
  for (let targetIndex = endRow - 1; targetIndex >= startRow; targetIndex -= 1) {
    const row = input.source.rows[targetIndex];
    if (row?.height?.rule === "exact" && resolveQuireTableRowHeightFloor(row.height) !== null) continue;
    rowHeights[targetIndex] = (rowHeights[targetIndex] ?? 0) + extraHeight;
    return;
  }
}
