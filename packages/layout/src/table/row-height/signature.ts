import { resolveQuireTableCellLineAllowance, resolveQuireTableRowLineAllowance } from "../border/occupancy/lines";
import type {
  QuireTableCellContentLayout,
  QuireTableGridTrack,
  QuireTableLayoutInput,
  QuireTableSourceCell,
  QuireTableSourceRow
} from "../types";

/**
 * Creates the canonical dependency signature for one independent base row.
 *
 * The signature excludes document position and table Y. It includes every
 * source, grid, inset, and measured-height fact consumed by base-row resolution.
 * Rowspan compensation remains a separate table-wide phase.
 *
 * @param input - Table constraints and inherited cell metrics.
 * @param row - Source row whose independent height is being resolved.
 * @param rowCells - Non-spanning semantic cells that start in the row.
 * @param measuredCells - Current measured cell content products.
 * @param tracks - Physical tracks selected for this row.
 * @returns Stable structural signature for retained row-height reuse.
 */
export function createQuireTableBaseRowHeightSignature(
  input: QuireTableLayoutInput,
  row: QuireTableSourceRow,
  rowCells: readonly QuireTableSourceCell[],
  measuredCells: ReadonlyMap<string, QuireTableCellContentLayout>,
  tracks: readonly QuireTableGridTrack[]
): string {
  return JSON.stringify({
    row: {
      rowIndex: row.rowIndex,
      height: row.height,
      cellSpacing: row.cellSpacing,
      lines: resolveQuireTableRowLineAllowance(input, row.rowIndex),
      cellLines: rowCells.map(cell => resolveQuireTableCellLineAllowance(input, cell))
    },
    constraints: {
      defaultRowHeight: input.constraints.defaultRowHeight,
      defaultCellPadding: input.constraints.defaultCellPadding,
      defaultBorderWidth: input.constraints.defaultBorderWidth
    },
    defaultCellMargins: input.source.defaultCellMargins,
    contentSizedRows: input.source.contentSizedRows === true,
    tracks: tracks.map((track) => [track.columnIndex, track.x, track.width]),
    cells: rowCells.map((cell) => ({
      id: cell.id,
      gridRect: cell.gridRect,
      cellMargins: cell.cellMargins,
      borders: cell.borders,
      styleBorders: cell.styleBorders ?? null,
      measuredHeight: measuredCells.get(cell.id)?.height ?? 0
    }))
  });
}
