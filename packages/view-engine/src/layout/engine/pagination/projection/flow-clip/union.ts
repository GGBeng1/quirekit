import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";

/**
 * Expands a running rectangle union without allocating a temporary rect list.
 *
 * @param current - Current union, or null before the first rectangle.
 * @param rect - Rectangle to include in the union.
 * @returns Expanded union rectangle.
 */
export function expandQuireProjectionRectUnion(
  current: QuireRect | null,
  rect: QuireRect
): QuireRect {
  if (current === null) {
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    };
  }

  const x = Math.min(current.x, rect.x);
  const y = Math.min(current.y, rect.y);
  const right = Math.max(current.x + current.width, rect.x + rect.width);
  const bottom = Math.max(current.y + current.height, rect.y + rect.height);

  return {
    x,
    y,
    width: right - x,
    height: bottom - y
  };
}

/**
 * Expands a running document-range union without allocating a range list.
 *
 * @param current - Current range union, or null before the first range.
 * @param range - Document range to include in the union.
 * @returns Expanded document range.
 */
export function expandQuireProjectionRangeUnion(
  current: QuireDocumentRange | null,
  range: QuireDocumentRange
): QuireDocumentRange {
  if (current === null) {
    return {
      from: range.from,
      to: range.to
    };
  }

  return {
    from: Math.min(current.from, range.from),
    to: Math.max(current.to, range.to)
  };
}
