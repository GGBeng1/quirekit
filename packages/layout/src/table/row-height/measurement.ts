import { resolveQuireTableCellInsets } from "../metrics";
import type { QuireTableCellContentLayout, QuireTableCellGeometry, QuireTableGridTrack, QuireTableLayoutInput, QuireTableSourceCell } from "../types";

/**
 * Resolves the measured outer height for a semantic cell.
 *
 * @param input - Table source and layout constraints.
 * @param measuredCells - Measured content layouts keyed by semantic cell id.
 * @param tracksByRow - Resolved physical table tracks for each source row.
 * @param cell - Source cell whose content height should be resolved.
 * @returns Cell content height plus top and bottom insets.
 */
export function resolveMeasuredCellOuterHeight(
  input: QuireTableLayoutInput,
  measuredCells: ReadonlyMap<string, QuireTableCellContentLayout>,
  tracksByRow: readonly (readonly QuireTableGridTrack[])[],
  cell: QuireTableSourceCell
): number {
  const measuredHeight = measuredCells.get(cell.id)?.height ?? 0;
  const insets = resolveQuireTableCellInsets(
    input,
    cell,
    createMeasurementCellRect(input, readCellRowTracks(tracksByRow, cell), cell)
  );

  return measuredHeight + insets.top + insets.bottom;
}

/**
 * Creates a temporary cell rectangle for inset resolution during measurement.
 *
 * @param input - Table source and layout constraints.
 * @param tracks - Resolved physical table tracks.
 * @param cell - Source cell to measure.
 * @returns Zero-height cell rectangle with resolved horizontal span.
 */
function createMeasurementCellRect(
  input: QuireTableLayoutInput,
  tracks: readonly QuireTableGridTrack[],
  cell: QuireTableSourceCell
): QuireTableCellGeometry["rect"] {
  const firstTrack = tracks[cell.gridRect.startColumn];
  const coveredTracks = tracks.slice(
    cell.gridRect.startColumn,
    cell.gridRect.startColumn + Math.max(1, cell.gridRect.columnSpan)
  );
  const lastTrack = coveredTracks.at(-1);
  const width = firstTrack && lastTrack
    ? (lastTrack.x + lastTrack.width) - firstTrack.x
    : 0;

  return {
    x: firstTrack?.x ?? input.constraints.rect.x,
    y: input.constraints.rect.y,
    width,
    height: 0
  };
}

/**
 * Reads the row-local tracks used by a source cell.
 *
 * @param tracksByRow - Resolved physical table tracks for each source row.
 * @param cell - Source cell whose start row selects the track set.
 * @returns Row-local tracks, or the first track set as a safe fallback.
 */
function readCellRowTracks(
  tracksByRow: readonly (readonly QuireTableGridTrack[])[],
  cell: QuireTableSourceCell
): readonly QuireTableGridTrack[] {
  return tracksByRow[cell.gridRect.startRow] ?? tracksByRow[0] ?? [];
}
