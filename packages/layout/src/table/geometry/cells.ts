import { alignCellContentRect, insetCellRect } from "./content-frame";
import type {
  QuireTableCellContentLayout,
  QuireTableCellGeometry,
  QuireTableGridTrack,
  QuireTableLayoutInput,
  QuireTableRowGeometry,
  QuireTableSourceCell
} from "../types";
import type { QuireTableTrackLayout } from "./tracks";
import { readQuireTableCellRowTracks } from "./tracks";

/** Fractional line widths leave float residue; content within this many CSS pixels of the area still fits. */
const overflowTolerance = 0.001;

/**
 * Measures every semantic cell with its resolved content width.
 *
 * @param input - Table source, constraints, and cell-content measurer.
 * @param tracks - Resolved row-local tracks used for cell widths.
 * @returns Cell content layouts keyed by semantic cell id.
 */
export function measureQuireTableCells(
  input: QuireTableLayoutInput,
  tracks: QuireTableTrackLayout
): ReadonlyMap<string, QuireTableCellContentLayout> {
  const measured = new Map<string, QuireTableCellContentLayout>();

  for (const cell of input.source.semanticCells) {
    const rect = createCellRect(
      input,
      readQuireTableCellRowTracks(tracks.rowTracks, cell, []),
      cell,
      input.constraints.rect.y,
      0
    );
    const contentRect = insetCellRect(input, cell, rect);

    measured.set(cell.id, input.measureContent(cell, contentRect));
  }

  return measured;
}

/**
 * Creates cell fragments from tracks, rows, and measured recursive content.
 *
 * @param input - Table source and layout constraints.
 * @param tracks - Resolved canonical and row-local tracks.
 * @param rows - Resolved row fragments.
 * @param measuredCells - Measured content layouts keyed by semantic cell id.
 * @returns Cell fragments in source semantic-cell order.
 */
export function layoutQuireTableCells(
  input: QuireTableLayoutInput,
  tracks: QuireTableTrackLayout,
  rows: readonly QuireTableRowGeometry[],
  measuredCells: ReadonlyMap<string, QuireTableCellContentLayout>
): readonly QuireTableCellGeometry[] {
  return input.source.semanticCells.map((cell) => {
    const rect = createCellRectFromRows(
      input,
      readQuireTableCellRowTracks(tracks.rowTracks, cell, tracks.tracks),
      rows,
      cell
    );
    const measured = measuredCells.get(cell.id) ?? { height: 0 };
    const contentRect = insetCellRect(input, cell, rect, true);
    const contentLayoutRect = alignCellContentRect(
      cell,
      contentRect,
      measured.height
    );

    return {
      id: `${input.tableId}:cell-${cell.gridRect.startRow}-${cell.gridRect.startColumn}`,
      semanticCellId: cell.id,
      originExplicitCellId: cell.originExplicitCellId,
      explicitCellIds: cell.explicitCellIds,
      originCellPos: cell.originCellPos,
      range: cell.contentRange,
      shading: cell.shading,
      backgroundColor: cell.backgroundColor,
      borders: cell.borders,
      ...(cell.styleBorders == null ? {} : { styleBorders: cell.styleBorders }),
      cellMargins: cell.cellMargins,
      preferredWidth: cell.preferredWidth,
      noWrap: cell.noWrap,
      verticalAlign: cell.verticalAlign,
      gridRect: cell.gridRect,
      rect,
      contentRect,
      ...(measured.height > contentRect.height + overflowTolerance ? { clipsOverflow: true } : {}),
      contentLayoutRect
    };
  });
}

/**
 * Creates a full cell rectangle from grid tracks and covered row fragments.
 *
 * @param input - Table source and layout constraints.
 * @param tracks - Resolved physical table tracks.
 * @param rows - Resolved row fragments.
 * @param cell - Source cell to place.
 * @returns Full cell rectangle covering the semantic cell's grid span.
 */
function createCellRectFromRows(
  input: QuireTableLayoutInput,
  tracks: readonly QuireTableGridTrack[],
  rows: readonly QuireTableRowGeometry[],
  cell: QuireTableSourceCell
): QuireTableCellGeometry["rect"] {
  const firstRow = rows[cell.gridRect.startRow];
  const coveredRows = rows.slice(
    cell.gridRect.startRow,
    cell.gridRect.startRow + Math.max(1, cell.gridRect.rowSpan)
  );
  const lastRow = coveredRows.at(-1);
  const coveredHeight = firstRow && lastRow
    ? (lastRow.rect.y + lastRow.rect.height) - firstRow.rect.y
    : 0;
  const fallbackHeight = input.constraints.defaultRowHeight *
    Math.max(1, cell.gridRect.rowSpan);

  return createCellRect(
    input,
    tracks,
    cell,
    firstRow?.rect.y ?? input.constraints.rect.y,
    coveredHeight > 0 ? coveredHeight : fallbackHeight
  );
}

/**
 * Creates a full cell rectangle from grid and row geometry.
 *
 * @param input - Table layout constraints.
 * @param tracks - Resolved physical table tracks.
 * @param cell - Source cell to place.
 * @param y - Row top coordinate.
 * @param height - Covered row height.
 * @returns Full cell rectangle.
 */
function createCellRect(
  input: QuireTableLayoutInput,
  tracks: readonly QuireTableGridTrack[],
  cell: QuireTableSourceCell,
  y: number,
  height: number
): QuireTableCellGeometry["rect"] {
  const firstTrack = tracks[cell.gridRect.startColumn];
  const coveredTracks = tracks.slice(
    cell.gridRect.startColumn,
    cell.gridRect.startColumn + cell.gridRect.columnSpan
  );
  const lastTrack = coveredTracks.at(-1);
  const width = firstTrack && lastTrack
    ? (lastTrack.x + lastTrack.width) - firstTrack.x
    : 0;

  return {
    x: firstTrack?.x ?? input.constraints.rect.x,
    y,
    width,
    height
  };
}
