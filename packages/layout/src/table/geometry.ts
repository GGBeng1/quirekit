import { resolveQuireTableRowHeights } from "./row-height";
import { layoutQuireTableCells, measureQuireTableCells } from "./geometry/cells";
import {
  resolveQuireTablePlacement,
  resolveQuireTablePlacementFromTracks
} from "./geometry/placement";
import { layoutQuireTableRows, resolveQuireTableHeight } from "./geometry/rows";
import { resolveQuireTableTrackLayout } from "./geometry/tracks";
import type {
  QuireTableGeometrySnapshot,
  QuireTableLayoutInput
} from "./types";

/**
 * Lays out a normalized table source as one single-page table fragment.
 *
 * Each phase consumes only the authority resolved by the previous phase:
 * horizontal placement, physical tracks, recursive cell measurement, row
 * geometry, then final cell geometry. Keeping that order explicit prevents
 * cell measurement and fragment assembly from independently re-resolving grid
 * or placement facts.
 *
 * @param input - Table source, constraints, and cell content measurer.
 * @returns Layout container carrying table geometry and cell content children.
 */
export function layoutQuireTableGeometry(
  input: QuireTableLayoutInput
): QuireTableGeometrySnapshot {
  const provisionalPlacement = resolveQuireTablePlacement(input);
  const provisionalTracks = resolveQuireTableTrackLayout(
    input,
    provisionalPlacement
  );
  const placement = resolveQuireTablePlacementFromTracks(
    input,
    provisionalPlacement,
    provisionalTracks.tracks,
    provisionalTracks.cellSpacing
  );
  const tracks = placement === provisionalPlacement
    ? provisionalTracks
    : resolveQuireTableTrackLayout(input, placement);
  const measuredCells = measureQuireTableCells(input, tracks);
  const rowHeights = resolveQuireTableRowHeights(
    input,
    measuredCells,
    tracks.rowTracks
  );
  const rows = layoutQuireTableRows(input, placement, tracks, rowHeights);
  const cells = layoutQuireTableCells(input, tracks, rows, measuredCells);

  return {
    // Keep source measurements before pagination duplicates headers or clips rows.
    sizing: {
      width: placement.width,
      columnWidths: tracks.tracks.map(track => track.width),
      rowHeights,
      cellMinimumHeights: cells.map(cell => ({
        startRow: cell.gridRect.startRow,
        rowSpan: cell.gridRect.rowSpan,
        height: (measuredCells.get(cell.semanticCellId)?.height ?? 0)
          + cell.rect.height - cell.contentRect.height
      }))
    },
    tableId: input.tableId,
    geometryId: input.tableId,
    tableRange: input.tableRange,
    style: input.source.style,
    borders: input.source.borders,
    cellSpacing: tracks.cellSpacing,
    rect: {
      x: placement.x,
      y: input.constraints.rect.y,
      width: placement.width,
      height: resolveQuireTableHeight(rowHeights, tracks)
    },
    tracks: tracks.tracks,
    rows,
    cells
  };
}
