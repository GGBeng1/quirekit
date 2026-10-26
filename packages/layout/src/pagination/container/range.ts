import type { QuireDocumentRange } from "@quirekit/renderer";

/**
 * Clamps a requested start index into the measured item array bounds.
 *
 * @param startIndex - Requested item index.
 * @param itemCount - Number of measured items.
 * @returns Start index safe for array access.
 */
export function clampQuireMeasuredContainerStartIndex(
  startIndex: number,
  itemCount: number
): number {
  return Math.min(Math.max(0, Math.trunc(startIndex)), itemCount);
}

/**
 * Extends an accepted document range with another item range.
 *
 * @param current - Current accepted range, if any.
 * @param next - Next item range to include.
 * @returns Combined accepted range.
 */
export function extendQuireMeasuredContainerRange(
  current: QuireDocumentRange | null,
  next: QuireDocumentRange
): QuireDocumentRange {
  if (current === null) {
    return next;
  }

  return {
    from: Math.min(current.from, next.from),
    to: Math.max(current.to, next.to)
  };
}

/**
 * Creates a collapsed document range at a single position.
 *
 * @param position - Document position.
 * @returns Collapsed document range.
 */
export function createCollapsedQuireRange(position: number): QuireDocumentRange {
  return { from: position, to: position };
}
