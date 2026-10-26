import type {
  QuireTableBorder,
  QuireTableBorderCandidate,
  QuireTableCellGeometry,
  QuireTableGeometrySnapshot,
  QuireTableLineSegment,
  QuireTableRowGeometry
} from "../types";
import { resolveVisibleQuireTableCellEdgeBounds } from "./edge-bounds";

const geometryEpsilon = 0.001;

/**
 * Creates border candidates from explicit table and cell border metadata.
 *
 * @param snapshot - Table snapshot to inspect.
 * @returns Source-derived border candidates.
 */
export function createSourceQuireTableBorderCandidates(
  snapshot: QuireTableGeometrySnapshot
): readonly QuireTableBorderCandidate[] {
  return snapshot.cells.flatMap((cell) => [
    ...createSourceCellHorizontalCandidates(snapshot, cell, "top"),
    ...createSourceCellHorizontalCandidates(snapshot, cell, "bottom"),
    ...createSourceCellVerticalCandidates(snapshot, cell, "left"),
    ...createSourceCellVerticalCandidates(snapshot, cell, "right")
  ]);
}

/**
 * Creates source candidates for one horizontal cell edge.
 *
 * @param snapshot - Table snapshot to inspect.
 * @param cell - Cell whose edge should contribute candidates.
 * @param edge - Horizontal cell edge to inspect.
 * @returns Source-derived candidates for the edge.
 */
function createSourceCellHorizontalCandidates(
  snapshot: QuireTableGeometrySnapshot,
  cell: QuireTableCellGeometry,
  edge: "top" | "bottom"
): readonly QuireTableBorderCandidate[] {
  const isOutside = isCellEdgeOnTableFragmentOutside(snapshot, cell, edge);
  const row = findSourceRowForHorizontalCellEdge(snapshot, cell, edge);
  const tableBorder = isOutside
    ? snapshot.borders?.[edge] ?? null
    : snapshot.borders?.insideH ?? null;
  const y = edge === "top" ? cell.rect.y : cell.rect.y + cell.rect.height;
  const line = {
    from: { x: cell.rect.x, y },
    to: { x: cell.rect.x + cell.rect.width, y }
  };

  return [
    createSourceTableCandidate(snapshot, cell, edge, tableBorder, isOutside, line),
    createSourceRowCandidate(row, cell, edge, row?.borders?.[edge] ?? null, line),
    createSourceCellCandidate(cell, edge, cell.styleBorders?.[edge] ?? null, line, "styleCell"),
    createSourceCellCandidate(cell, edge, cell.borders?.[edge] ?? null, line)
  ].filter(isBorderCandidate);
}

/**
 * Creates source candidates for one vertical cell edge.
 *
 * @param snapshot - Table snapshot to inspect.
 * @param cell - Cell whose edge should contribute candidates.
 * @param edge - Vertical cell edge to inspect.
 * @returns Source-derived candidates for the edge.
 */
function createSourceCellVerticalCandidates(
  snapshot: QuireTableGeometrySnapshot,
  cell: QuireTableCellGeometry,
  edge: "left" | "right"
): readonly QuireTableBorderCandidate[] {
  const isOutside = isCellEdgeOnTableFragmentOutside(snapshot, cell, edge);
  const tableBorder = isOutside
    ? snapshot.borders?.[edge] ?? null
    : snapshot.borders?.insideV ?? null;
  const x = edge === "left" ? cell.rect.x : cell.rect.x + cell.rect.width;
  const line = {
    from: { x, y: cell.rect.y },
    to: { x, y: cell.rect.y + cell.rect.height }
  };

  return [
    createSourceTableCandidate(snapshot, cell, edge, tableBorder, isOutside, line),
    ...createSourceRowVerticalCandidates(snapshot, cell, edge, isOutside, x),
    createSourceCellCandidate(cell, edge, cell.styleBorders?.[edge] ?? null, line, "styleCell"),
    createSourceCellCandidate(cell, edge, cell.borders?.[edge] ?? null, line)
  ].filter(isBorderCandidate);
}

/**
 * Checks whether a source cell edge sits on the current table fragment outside.
 *
 * @param snapshot - Page-local or single-page table snapshot.
 * @param cell - Cell fragment whose edge should be classified.
 * @param edge - Physical edge represented by the candidate.
 * @returns True when the edge is on the current visible table fragment border.
 */
function isCellEdgeOnTableFragmentOutside(
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
 * Compares two coordinates with table-fragment geometry tolerance.
 *
 * @param left - First coordinate.
 * @param right - Second coordinate.
 * @returns True when both coordinates should be treated as the same edge.
 */
function isCloseTo(left: number, right: number): boolean {
  return Math.abs(left - right) <= geometryEpsilon;
}

/**
 * Creates a table or inside-border candidate for one cell edge.
 *
 * @param snapshot - Table snapshot that owns the candidate.
 * @param cell - Cell edge represented by the candidate.
 * @param edge - Physical edge represented by the candidate.
 * @param border - Normalized border value for the candidate.
 * @param isOutside - Whether the candidate came from an outside table border.
 * @param line - Candidate line in document coordinates.
 * @returns Border candidate, or null when the border is absent.
 */
function createSourceTableCandidate(
  snapshot: QuireTableGeometrySnapshot,
  cell: QuireTableCellGeometry,
  edge: QuireTableBorderCandidate["edge"],
  border: QuireTableBorder | null,
  isOutside: boolean,
  line: QuireTableLineSegment
): QuireTableBorderCandidate | null {
  if (!border) {
    return null;
  }

  const source = isOutside ? "table" : "inside";

  return {
    id: `${cell.id}:border-${edge}:${source}`,
    edge,
    border,
    source,
    priority: isOutside ? 1 : 0,
    ownerId: snapshot.tableId,
    edgeOwnerId: `${cell.id}:${edge}`,
    line
  };
}

/**
 * Finds the source row represented by one horizontal cell edge.
 *
 * @param snapshot - Table snapshot to inspect.
 * @param cell - Cell whose horizontal edge is being resolved.
 * @param edge - Horizontal edge to classify.
 * @returns Matching row fragment, or null when it is unavailable.
 */
function findSourceRowForHorizontalCellEdge(
  snapshot: QuireTableGeometrySnapshot,
  cell: QuireTableCellGeometry,
  edge: "top" | "bottom"
): QuireTableRowGeometry | null {
  const rowIndex = edge === "top"
    ? cell.gridRect.startRow
    : cell.gridRect.startRow + cell.gridRect.rowSpan - 1;

  return snapshot.rows.find((row) => row.rowIndex === rowIndex) ?? null;
}

/**
 * Creates a row-border candidate for one horizontal cell edge.
 *
 * @param row - Row fragment that owns the edge, if available.
 * @param cell - Cell edge represented by the candidate.
 * @param edge - Physical edge represented by the candidate.
 * @param border - Normalized border value for the candidate.
 * @param line - Candidate line in document coordinates.
 * @returns Border candidate, or null when the border is absent.
 */
function createSourceRowCandidate(
  row: QuireTableRowGeometry | null,
  cell: QuireTableCellGeometry,
  edge: QuireTableBorderCandidate["edge"],
  border: QuireTableBorder | null,
  line: QuireTableLineSegment
): QuireTableBorderCandidate | null {
  if (!border || row === null) {
    return null;
  }

  return {
    id: `${cell.id}:border-${edge}:row`,
    edge,
    border,
    source: "row",
    priority: 2,
    ownerId: row.id,
    edgeOwnerId: `${cell.id}:${edge}`,
    line
  };
}

/**
 * Creates row-border candidates for a vertical cell edge.
 *
 * @param snapshot - Table snapshot to inspect.
 * @param cell - Cell edge represented by the candidate.
 * @param edge - Vertical edge to classify.
 * @param isOutside - Whether the edge lies on the page-local table outside.
 * @param x - Physical x coordinate of the vertical edge.
 * @returns Row-derived vertical candidates split by covered row fragments.
 */
function createSourceRowVerticalCandidates(
  snapshot: QuireTableGeometrySnapshot,
  cell: QuireTableCellGeometry,
  edge: "left" | "right",
  isOutside: boolean,
  x: number
): readonly (QuireTableBorderCandidate | null)[] {
  return snapshot.rows
    .filter((row) => doesCellCoverRow(cell, row.rowIndex))
    .map((row) => {
      const line = createRowVerticalBorderLine(cell, row, x);
      const border = isOutside
        ? row.borders?.[edge] ?? null
        : row.borders?.insideV ?? null;

      return line === null
        ? null
        : createSourceRowCandidate(row, cell, edge, border, line);
    });
}

/**
 * Checks whether a cell's semantic grid rectangle covers one row.
 *
 * @param cell - Cell fragment to inspect.
 * @param rowIndex - Row index to test.
 * @returns Whether the row belongs to the cell's row span.
 */
function doesCellCoverRow(
  cell: QuireTableCellGeometry,
  rowIndex: number
): boolean {
  return cell.gridRect.startRow <= rowIndex &&
    rowIndex < cell.gridRect.startRow + cell.gridRect.rowSpan;
}

/**
 * Creates a row-local vertical border line clipped to both row and cell rects.
 *
 * @param cell - Cell fragment owning the physical edge.
 * @param row - Row fragment contributing row-level border metadata.
 * @param x - Physical x coordinate of the vertical edge.
 * @returns Row-local vertical line, or null when the row and cell do not overlap.
 */
function createRowVerticalBorderLine(
  cell: QuireTableCellGeometry,
  row: QuireTableRowGeometry,
  x: number
): QuireTableLineSegment | null {
  const top = Math.max(cell.rect.y, row.rect.y);
  const bottom = Math.min(
    cell.rect.y + cell.rect.height,
    row.rect.y + row.rect.height
  );

  if (bottom <= top + geometryEpsilon) {
    return null;
  }

  return {
    from: { x, y: top },
    to: { x, y: bottom }
  };
}

/**
 * Creates a cell-border candidate for one cell edge.
 *
 * Table-style cell borders outrank direct table and row borders but yield to
 * direct cell borders, matching Word's cell-over-table fallback.
 *
 * @param cell - Cell edge represented by the candidate.
 * @param edge - Physical edge represented by the candidate.
 * @param border - Normalized border value for the candidate.
 * @param line - Candidate line in document coordinates.
 * @param source - Direct cell border or table-style cell border.
 * @returns Border candidate, or null when the border is absent.
 */
function createSourceCellCandidate(
  cell: QuireTableCellGeometry,
  edge: QuireTableBorderCandidate["edge"],
  border: QuireTableBorder | null,
  line: QuireTableLineSegment,
  source: "cell" | "styleCell" = "cell"
): QuireTableBorderCandidate | null {
  if (!border) {
    return null;
  }

  return {
    id: `${cell.id}:border-${edge}:${source}`,
    edge,
    border,
    source,
    priority: source === "cell" ? 4 : 3,
    ownerId: cell.id,
    edgeOwnerId: `${cell.id}:${edge}`,
    line
  };
}

/**
 * Narrows nullable border candidate output.
 *
 * @param candidate - Candidate to inspect.
 * @returns True when the candidate is present.
 */
function isBorderCandidate(
  candidate: QuireTableBorderCandidate | null
): candidate is QuireTableBorderCandidate {
  return candidate !== null;
}
