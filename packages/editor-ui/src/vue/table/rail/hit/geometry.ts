import type { QuireMountedTableChromeAnchor } from "@quirekit/core";
import type { ResizeHitBoundary, ResizeHitSegment } from "./types";

/**
 * Finds the first sorted item whose coordinate is not below the query.
 * @param items - Sorted geometry records.
 * @param value - Query coordinate.
 * @param coordinate - Reads the indexed coordinate.
 * @returns Insertion offset, including the end of the array.
 */
function lowerBound<T>(items: readonly T[], value: number, coordinate: (item: T) => number): number {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (coordinate(items[middle]!) < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

/**
 * Indexes only mounted View boundaries, once per geometry snapshot.
 * @param anchors - Current fragment's viewport-space resize anchors.
 * @param column - Whether to index vertical column boundaries.
 * @returns Sorted primary coordinates with sorted cross-axis segments.
 */
function compileAxis(anchors: readonly QuireMountedTableChromeAnchor[], column: boolean): ResizeHitBoundary[] {
  const groups = new Map<number, ResizeHitSegment[]>();
  for (const anchor of anchors) {
    if (anchor.kind !== (column ? "resize-column" : "resize-row")) continue;
    const coordinate = column ? anchor.rect.left : anchor.rect.top;
    const start = column ? anchor.rect.top : anchor.rect.left;
    const end = column ? anchor.rect.bottom : anchor.rect.right;
    if (![coordinate, start, end].every(Number.isFinite) || end < start) continue;
    const segments = groups.get(coordinate) ?? [];
    segments.push({ start, end, anchor });
    groups.set(coordinate, segments);
  }
  return [...groups].map(([coordinate, segments]) => ({
    coordinate,
    segments: segments.sort((a, b) => a.start - b.start)
  })).sort((a, b) => a.coordinate - b.coordinate);
}

/**
 * Resolves the closest real segment within the existing eight-pixel hit strip.
 * @param boundaries - Compiled physical boundaries on one axis.
 * @param primary - Pointer coordinate perpendicular to the boundary.
 * @param cross - Pointer coordinate along the boundary.
 * @returns Closest hit and its distance, or null outside physical segments.
 */
function hitAxis(boundaries: readonly ResizeHitBoundary[], primary: number, cross: number) {
  const offset = lowerBound(boundaries, primary - 4, boundary => boundary.coordinate);
  let result: { anchor: QuireMountedTableChromeAnchor; distance: number } | null = null;
  // Search only the hit strip, including densely zoomed tracks: a nearer
  // boundary may be absent at this cross coordinate because of a merged cell.
  for (let index = offset; index < boundaries.length; index++) {
    const boundary = boundaries[index]!;
    if (boundary.coordinate > primary + 4) break;
    const distance = Math.abs(boundary.coordinate - primary);
    if (distance > 4 || (result !== null && distance >= result.distance)) continue;
    const next = lowerBound(boundary.segments, cross, segment => segment.end);
    const segment = boundary.segments[next];
    if (segment && cross >= segment.start && cross <= segment.end) {
      result = { anchor: segment.anchor, distance };
    }
  }
  return result;
}

/**
 * Compiles immutable client-space geometry for bounded pointer discovery.
 * @param anchors - Current mounted fragment's physically valid resize anchors.
 * @returns An indexed hit query bounded by edges inside the eight-pixel strip.
 */
export function createTableResizeHitTest(anchors: readonly QuireMountedTableChromeAnchor[]) {
  const columns = compileAxis(anchors, true);
  const rows = compileAxis(anchors, false);
  /**
   * Resolves a pointer using the same CSS-pixel space as mounted geometry.
   * @param x - Pointer client X.
   * @param y - Pointer client Y.
   * @returns Existing anchor, preferring column resize at an exact corner tie.
   */
  return function hitTest(x: number, y: number): QuireMountedTableChromeAnchor | null {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const column = hitAxis(columns, x, y);
    const row = hitAxis(rows, y, x);
    if (column && (!row || column.distance <= row.distance)) return column.anchor;
    return row?.anchor ?? null;
  };
}
