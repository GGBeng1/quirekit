import type { QuireDocumentRange } from "@quirekit/renderer";

/**
 * Intersects two document ranges.
 *
 * @param first - First range.
 * @param second - Second range.
 * @returns Intersected range.
 */
export function intersectRanges(
  first: QuireDocumentRange,
  second: QuireDocumentRange
): QuireDocumentRange {
  return {
    from: Math.max(first.from, second.from),
    to: Math.min(first.to, second.to)
  };
}
