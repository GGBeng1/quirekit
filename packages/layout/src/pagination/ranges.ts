import {
  containsQuireDocumentRange,
  doQuireDocumentRangesIntersect
} from "@quirekit/renderer";
import type { QuireDocumentRange } from "@quirekit/renderer";

/** Projection-like object that owns a page document range. */
export interface QuireDocumentRangePageOwner {
  /** Page metadata containing the range represented by one fragment. */
  readonly page: {
    /** Document range represented by the page-like fragment. */
    readonly range: QuireDocumentRange;
  };
}

/**
 * Finds the page-body projection that fully contains a document range.
 *
 * @param range - Document range to locate.
 * @param projections - Available page-body projections.
 * @returns Matching page projection, or undefined when the range crosses pages.
 */
export function findQuirePageBodyProjectionForRange<
  Projection extends QuireDocumentRangePageOwner
>(
  range: QuireDocumentRange,
  projections: readonly Projection[]
): Projection | undefined {
  return projections.find((projection) =>
    containsQuireDocumentRange(projection.page.range, range)
  );
}

/**
 * Finds the page-body projection whose range intersects a document range.
 *
 * @param range - Document range to locate.
 * @param projections - Available page-body projections.
 * @returns Matching page projection, or undefined when the range touches no page.
 */
export function findQuirePageBodyProjectionIntersectingRange<
  Projection extends QuireDocumentRangePageOwner
>(
  range: QuireDocumentRange,
  projections: readonly Projection[]
): Projection | undefined {
  return projections.find((projection) =>
    doQuireDocumentRangesIntersect(projection.page.range, range)
  );
}
