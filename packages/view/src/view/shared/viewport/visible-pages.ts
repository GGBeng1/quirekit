import {
  doQuireRectsIntersect,
  type QuireRect
} from "@quirekit/renderer";
import type { ResolveMountedVisiblePageIndicesOptions } from "./types";

/**
 * Resolves which page indices intersect a visible region, expanded by a buffer.
 *
 * A page is visible when its rectangle intersects `visibleRect`. The set is then
 * expanded vertically by `bufferPages` worth of neighbours on each side so pages
 * just outside the viewport stay live. For the standard stacked, non-overlapping
 * page layout, expanding by `bufferPages` neighbours equals expanding the visible
 * rectangle by those neighbours' heights and re-intersecting, so the result is the
 * indices whose rect intersects the buffered region. Returned indices are ascending
 * and contiguous.
 *
 * @param pageRects - Page rectangles in document order, in document space.
 * @param visibleRect - Visible region in document space.
 * @param bufferPages - Extra neighbour pages kept live above and below the visible
 * set. Clamped to the document bounds.
 * @returns Ascending page indices in the buffered visible set, or an empty array
 * when no page intersects the visible region.
 */
export function resolveVisiblePageIndices(
  pageRects: readonly QuireRect[],
  visibleRect: QuireRect,
  bufferPages: number
): number[] {
  if (!(visibleRect.width > 0 && visibleRect.height > 0)) return [];
  let first = -1;
  let last = -1;

  for (let index = 0; index < pageRects.length; index += 1) {
    if (doQuireRectsIntersect(pageRects[index]!, visibleRect)) {
      if (first === -1) {
        first = index;
      }

      last = index;
    }
  }

  if (first === -1) {
    return [];
  }

  const buffer = Math.max(0, Math.trunc(bufferPages));
  const start = Math.max(0, first - buffer);
  const end = Math.min(pageRects.length - 1, last + buffer);
  const indices: number[] = [];

  for (let index = start; index <= end; index += 1) {
    indices.push(index);
  }

  return indices;
}

/**
 * Resolves mounted page indices without allocating surfaces for an empty viewport.
 *
 * @param options - Viewport coordinator, page rectangles, and buffer size.
 * @returns Page indices to keep mounted.
 */
export function resolveMountedVisiblePageIndices(
  options: ResolveMountedVisiblePageIndicesOptions
): number[] {
  if (options.coordinator === undefined || options.pageRects.length === 0) {
    return [];
  }

  return options.coordinator.getVisiblePageIndices(
    options.pageRects,
    options.bufferPages ?? 0
  );

}
