import type { QuireTableLayoutSnapshot } from "../../../layout/engine/table";
import {
  createTableChromeAnchor,
  uniqueSemanticCellIds
} from "./shared";
import type { QuireTableChromeAnchor } from "./types";

const RESIZE_SEGMENT_JOIN_TOLERANCE = 0.01;

type ResizeEdgeSegment = {
  readonly start: number;
  readonly end: number;
  readonly semanticCellIds: readonly string[];
};

/**
 * Builds trailing-edge resize anchors from physically rendered cell edges.
 *
 * @param table - Page-local Table snapshot.
 * @param tableRect - Semantic visual grid bounds.
 * @returns Row resize anchors followed by column resize anchors.
 */
export function createTableResizeAnchors(
  table: QuireTableLayoutSnapshot,
  tableRect: QuireTableLayoutSnapshot["rect"]
): readonly QuireTableChromeAnchor[] {
  const rows = table.rows.flatMap(row => (
    createRowResizeAnchors(table, tableRect, row)
  ));
  const columns = table.tracks.flatMap(track => (
    createColumnResizeAnchors(table, tableRect, track)
  ));

  return [...rows, ...columns];
}

/**
 * Creates resize targets for the visible cell edges ending at one source row.
 *
 * @param table - Page-local Table snapshot.
 * @param tableRect - Semantic visual grid bounds.
 * @param row - Source row whose physical trailing edge is being projected.
 * @returns Contiguous horizontal resize targets for the row boundary.
 */
function createRowResizeAnchors(
  table: QuireTableLayoutSnapshot,
  tableRect: QuireTableLayoutSnapshot["rect"],
  row: QuireTableLayoutSnapshot["rows"][number]
): readonly QuireTableChromeAnchor[] {
  const tableRight = tableRect.x + tableRect.width;
  const segments = mergeResizeEdgeSegments(
    table.cells
      .filter(cell => (
        cell.gridRect.startRow + cell.gridRect.rowSpan - 1 === row.rowIndex
      ))
      .map(cell => ({
        start: Math.max(tableRect.x, cell.rect.x),
        end: Math.min(tableRight, cell.rect.x + cell.rect.width),
        semanticCellIds: [cell.semanticCellId]
      }))
      .filter(segment => segment.end > segment.start)
  );
  const boundaryY = row.rect.y + row.rect.height;

  return segments.map((segment, segmentIndex): QuireTableChromeAnchor => ({
    ...createTableChromeAnchor(
      `${table.fragmentId}:resize-row:${row.rowIndex}:${segmentIndex}`,
      "resize-row",
      {
        x: segment.start,
        y: boundaryY,
        width: segment.end - segment.start,
        height: 0
      },
      table.tableRange.from,
      segment.semanticCellIds
    ),
    rowIndex: row.rowIndex
  }));
}

/**
 * Creates resize targets for the visible cell edges ending at one grid track.
 *
 * @param table - Page-local Table snapshot.
 * @param tableRect - Semantic visual grid bounds.
 * @param track - Grid track whose physical trailing edge is being projected.
 * @returns Contiguous vertical resize targets for the column boundary.
 */
function createColumnResizeAnchors(
  table: QuireTableLayoutSnapshot,
  tableRect: QuireTableLayoutSnapshot["rect"],
  track: QuireTableLayoutSnapshot["tracks"][number]
): readonly QuireTableChromeAnchor[] {
  const tableBottom = tableRect.y + tableRect.height;
  const segments = mergeResizeEdgeSegments(
    table.cells
      .filter(cell => (
        cell.gridRect.startColumn + cell.gridRect.columnSpan - 1
          === track.columnIndex
      ))
      .map(cell => ({
        start: Math.max(tableRect.y, cell.rect.y),
        end: Math.min(tableBottom, cell.rect.y + cell.rect.height),
        semanticCellIds: [cell.semanticCellId]
      }))
      .filter(segment => segment.end > segment.start)
  );
  const boundaryX = track.x + track.width;

  return segments.map((segment, segmentIndex): QuireTableChromeAnchor => ({
    ...createTableChromeAnchor(
      `${table.fragmentId}:resize-column:${track.columnIndex}:${segmentIndex}`,
      "resize-column",
      {
        x: boundaryX,
        y: segment.start,
        width: 0,
        height: segment.end - segment.start
      },
      table.tableRange.from,
      segment.semanticCellIds
    ),
    columnIndex: track.columnIndex
  }));
}

/**
 * Joins touching or overlapping cell-edge intervals without bridging gaps.
 *
 * The gap is the important ownership boundary: it lets the Canvas text surface
 * receive pointer input wherever a merged cell hides an underlying grid line.
 *
 * @param segments - Unordered physical cell-edge intervals on one axis.
 * @returns Stable contiguous intervals with deduplicated semantic cell ids.
 */
function mergeResizeEdgeSegments(
  segments: readonly ResizeEdgeSegment[]
): readonly ResizeEdgeSegment[] {
  const ordered = [...segments].sort((left, right) => (
    left.start - right.start || left.end - right.end
  ));
  const merged: ResizeEdgeSegment[] = [];

  for (const segment of ordered) {
    const previous = merged.at(-1);
    if (
      previous === undefined
      || segment.start > previous.end + RESIZE_SEGMENT_JOIN_TOLERANCE
    ) {
      merged.push(segment);
      continue;
    }
    merged[merged.length - 1] = {
      start: previous.start,
      end: Math.max(previous.end, segment.end),
      semanticCellIds: uniqueSemanticCellIds([
        ...previous.semanticCellIds,
        ...segment.semanticCellIds
      ])
    };
  }

  return merged;
}
