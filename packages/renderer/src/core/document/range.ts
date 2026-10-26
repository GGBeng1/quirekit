import type { QuireDocumentRange } from "@quirekit/render-contract";

/**
 * Checks whether a document range covers no content.
 *
 * @param range - Document range to inspect.
 * @returns Whether the range is empty or inverted.
 */
export function isQuireDocumentRangeEmpty(range: QuireDocumentRange): boolean {
  return range.to <= range.from;
}

/**
 * Checks whether one document range fully contains another range.
 *
 * @param outer - Candidate containing range.
 * @param inner - Candidate contained range.
 * @returns Whether `inner` is fully inside `outer`.
 */
export function containsQuireDocumentRange(
  outer: QuireDocumentRange,
  inner: QuireDocumentRange
): boolean {
  return inner.from >= outer.from && inner.to <= outer.to;
}

/**
 * Checks whether two half-open document ranges overlap.
 *
 * @param first - First document range.
 * @param second - Second document range.
 * @returns Whether the ranges share document content.
 */
export function doQuireDocumentRangesIntersect(
  first: QuireDocumentRange,
  second: QuireDocumentRange
): boolean {
  return first.from < second.to && second.from < first.to;
}

/**
 * Computes the overlap between two half-open document ranges.
 *
 * @param first - First document range.
 * @param second - Second document range.
 * @returns Intersected range, or null when the ranges do not overlap.
 */
export function intersectQuireDocumentRanges(
  first: QuireDocumentRange,
  second: QuireDocumentRange
): QuireDocumentRange | null {
  if (!doQuireDocumentRangesIntersect(first, second)) {
    return null;
  }

  return {
    from: Math.max(first.from, second.from),
    to: Math.min(first.to, second.to)
  };
}

/**
 * Computes one range spanning all supplied document ranges.
 *
 * @param ranges - Ranges to union.
 * @returns Spanning range, or null when no ranges are available.
 */
export function unionQuireDocumentRanges(
  ranges: readonly QuireDocumentRange[]
): QuireDocumentRange | null {
  if (ranges.length === 0) {
    return null;
  }

  let from = ranges[0]!.from;
  let to = ranges[0]!.to;

  for (let index = 1; index < ranges.length; index += 1) {
    const range = ranges[index]!;
    from = Math.min(from, range.from);
    to = Math.max(to, range.to);
  }

  return { from, to };
}
