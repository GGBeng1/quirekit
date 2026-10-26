import type { QuireDocumentRange } from "../../core/document";

/**
 * Checks whether a document range contains a position.
 *
 * @param range - Range to inspect.
 * @param position - Position to test.
 * @returns Whether the position falls inside the range boundary.
 */
export function containsDocumentPosition(
  range: QuireDocumentRange,
  position: number
): boolean {
  return position >= range.from && position <= range.to;
}

/**
 * Checks whether two document ranges overlap.
 *
 * @param first - First range.
 * @param second - Second range.
 * @returns Whether the ranges overlap.
 */
export function rangesOverlap(
  first: QuireDocumentRange,
  second: QuireDocumentRange
): boolean {
  return first.from <= second.to && second.from <= first.to;
}
