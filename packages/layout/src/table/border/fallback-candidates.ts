import {
  defaultQuireTableBorderStyle,
  defaultQuireTableBorderWidth
} from "./style";
import { resolveVisibleQuireTableCellEdgeBounds } from "./edge-bounds";
import type {
  QuireTableBorder,
  QuireTableBorderCandidate,
  QuireTableCellGeometry,
  QuireTableLineSegment,
  QuireTableGeometrySnapshot
} from "../types";

const geometryEpsilon = 0.001;
const cellEdges = ["top", "bottom", "left", "right"] as const;

/**
 * Creates C1 fallback candidates from the table snapshot's row and column grid.
 *
 * @param snapshot - Table snapshot to inspect.
 * @returns Border candidates matching the previous C1 paint model.
 */
export function createC1QuireTableBorderCandidates(
  snapshot: QuireTableGeometrySnapshot
): readonly QuireTableBorderCandidate[] {
  const border = createSnapshotBorder(snapshot);

  if (
    hasMergedCellFragments(snapshot) ||
    hasSeparatedCellFragments(snapshot) ||
    hasRowOffsetFragments(snapshot)
  ) {
    return createMergedC1QuireTableBorderCandidates(snapshot, border);
  }

  const candidates: QuireTableBorderCandidate[] = snapshot.rows.map((row) => ({
    id: `${snapshot.geometryId}:border-top-${row.rowIndex}`,
    edge: "top",
    border,
    source: row.rowIndex === 0 ? "table" : "inside",
    priority: row.rowIndex === 0 ? 1 : 0,
    ownerId: row.id,
    line: {
      from: { x: row.rect.x, y: row.rect.y },
      to: { x: row.rect.x + row.rect.width, y: row.rect.y }
    }
  }));
  const lastRow = snapshot.rows.at(-1);

  if (lastRow) {
    candidates.push({
      id: `${snapshot.geometryId}:border-bottom-${lastRow.rowIndex}`,
      edge: "bottom",
      border,
      source: "table",
      priority: 1,
      ownerId: lastRow.id,
      line: {
        from: {
          x: lastRow.rect.x,
          y: lastRow.rect.y + lastRow.rect.height
        },
        to: {
          x: lastRow.rect.x + lastRow.rect.width,
          y: lastRow.rect.y + lastRow.rect.height
        }
      }
    });
  }

  candidates.push(...snapshot.tracks.map((track) => ({
    id: `${snapshot.geometryId}:border-left-${track.columnIndex}`,
    edge: "left" as const,
    border,
    source: track.columnIndex === 0 ? "table" as const : "inside" as const,
    priority: track.columnIndex === 0 ? 1 : 0,
    ownerId: track.id,
    line: {
      from: { x: track.x, y: snapshot.rect.y },
      to: { x: track.x, y: snapshot.rect.y + snapshot.rect.height }
    }
  })));

  const lastTrack = snapshot.tracks.at(-1);

  if (lastTrack) {
    candidates.push({
      id: `${snapshot.geometryId}:border-right-${lastTrack.columnIndex}`,
      edge: "right",
      border,
      source: "table",
      priority: 1,
      ownerId: lastTrack.id,
      line: {
        from: {
          x: lastTrack.x + lastTrack.width,
          y: snapshot.rect.y
        },
        to: {
          x: lastTrack.x + lastTrack.width,
          y: snapshot.rect.y + snapshot.rect.height
        }
      }
    });
  }

  return candidates;
}

/**
 * Checks whether fallback grid borders need semantic-cell edge segmentation.
 *
 * @param snapshot - Table snapshot to inspect.
 * @returns True when at least one cell spans multiple rows or columns.
 */
function hasMergedCellFragments(snapshot: QuireTableGeometrySnapshot): boolean {
  return snapshot.cells.some((cell) =>
    cell.gridRect.rowSpan > 1 || cell.gridRect.columnSpan > 1
  );
}

/**
 * Checks whether fallback borders should respect separated cell boxes.
 *
 * @param snapshot - Table snapshot to inspect.
 * @returns True when the table uses non-collapsed cell spacing.
 */
function hasSeparatedCellFragments(snapshot: QuireTableGeometrySnapshot): boolean {
  return (snapshot.cellSpacing ?? 0) > 0 ||
    snapshot.rows.some((row) => (row.cellSpacing ?? 0) > 0);
}

/**
 * Checks whether fallback borders should avoid omitted row-offset grid slots.
 *
 * @param snapshot - Table snapshot to inspect.
 * @returns True when at least one row omits leading or trailing grid columns.
 */
function hasRowOffsetFragments(snapshot: QuireTableGeometrySnapshot): boolean {
  return snapshot.rows.some((row) =>
    (row.gridBefore?.columnSpan ?? 0) > 0 ||
    (row.gridAfter?.columnSpan ?? 0) > 0
  );
}

/**
 * Creates fallback candidates from semantic cell edges for merged tables.
 *
 * @param snapshot - Table snapshot to inspect.
 * @param border - Synthetic fallback border style.
 * @returns Cell-edge candidates with merged-cell internal edges suppressed.
 */
function createMergedC1QuireTableBorderCandidates(
  snapshot: QuireTableGeometrySnapshot,
  border: QuireTableBorder
): readonly QuireTableBorderCandidate[] {
  return snapshot.cells.flatMap((cell) =>
    cellEdges.map((edge) =>
      createMergedC1CellBorderCandidate(snapshot, cell, edge, border)
    )
  );
}

/**
 * Creates one fallback candidate for a semantic cell edge.
 *
 * @param snapshot - Table snapshot that owns the cell.
 * @param cell - Cell fragment whose edge should paint.
 * @param edge - Physical edge represented by the candidate.
 * @param border - Synthetic fallback border style.
 * @returns Border candidate for one semantic cell edge.
 */
function createMergedC1CellBorderCandidate(
  snapshot: QuireTableGeometrySnapshot,
  cell: QuireTableCellGeometry,
  edge: QuireTableBorderCandidate["edge"],
  border: QuireTableBorder
): QuireTableBorderCandidate {
  const isOutside = isCellEdgeOnTableOutside(snapshot, cell, edge);

  return {
    id: `${snapshot.geometryId}:border-${edge}:${cell.id}`,
    edge,
    border,
    source: isOutside ? "table" : "inside",
    priority: isOutside ? 1 : 0,
    ownerId: cell.id,
    line: createCellEdgeLine(cell, edge)
  };
}

/**
 * Checks whether a cell edge sits on the visible table outside edge.
 *
 * @param snapshot - Table snapshot containing page-local table geometry.
 * @param cell - Cell fragment whose edge is inspected.
 * @param edge - Physical edge represented by the candidate.
 * @returns True when the edge belongs to the visible outside border.
 */
function isCellEdgeOnTableOutside(
  snapshot: QuireTableGeometrySnapshot,
  cell: QuireTableCellGeometry,
  edge: QuireTableBorderCandidate["edge"]
): boolean {
  const visibleBounds = resolveVisibleQuireTableCellEdgeBounds(snapshot, cell);

  switch (edge) {
    case "top":
      return isCloseTo(cell.rect.y, visibleBounds.top);
    case "bottom":
      return isCloseTo(
        cell.rect.y + cell.rect.height,
        visibleBounds.bottom
      );
    case "left":
      return isCloseTo(cell.rect.x, visibleBounds.left);
    case "right":
      return isCloseTo(
        cell.rect.x + cell.rect.width,
        visibleBounds.right
      );
  }
}

/**
 * Creates the physical line for one cell edge.
 *
 * @param cell - Cell fragment whose edge should paint.
 * @param edge - Physical edge represented by the candidate.
 * @returns Physical line for the edge.
 */
function createCellEdgeLine(
  cell: QuireTableCellGeometry,
  edge: QuireTableBorderCandidate["edge"]
): QuireTableLineSegment {
  switch (edge) {
    case "top":
      return {
        from: { x: cell.rect.x, y: cell.rect.y },
        to: { x: cell.rect.x + cell.rect.width, y: cell.rect.y }
      };
    case "bottom":
      return {
        from: { x: cell.rect.x, y: cell.rect.y + cell.rect.height },
        to: {
          x: cell.rect.x + cell.rect.width,
          y: cell.rect.y + cell.rect.height
        }
      };
    case "left":
      return {
        from: { x: cell.rect.x, y: cell.rect.y },
        to: { x: cell.rect.x, y: cell.rect.y + cell.rect.height }
      };
    case "right":
      return {
        from: { x: cell.rect.x + cell.rect.width, y: cell.rect.y },
        to: {
          x: cell.rect.x + cell.rect.width,
          y: cell.rect.y + cell.rect.height
        }
      };
  }
}

/**
 * Compares two geometry coordinates with a small pixel tolerance.
 *
 * @param left - First coordinate.
 * @param right - Second coordinate.
 * @returns True when the coordinates are visually equivalent.
 */
function isCloseTo(left: number, right: number): boolean {
  return Math.abs(left - right) <= geometryEpsilon;
}

/**
 * Creates a normalized fallback border from the snapshot's resolved style.
 *
 * @param snapshot - Snapshot containing the C1 style.
 * @returns Normalized border for fallback edges.
 */
function createSnapshotBorder(snapshot: QuireTableGeometrySnapshot): QuireTableBorder {
  return {
    style: "single",
    width: snapshot.style.borderWidth || defaultQuireTableBorderWidth,
    color: snapshot.style.borderColor || defaultQuireTableBorderStyle,
    spacing: null
  };
}
