import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuirePageFragment } from "../types";

/**
 * Finds a page for an exact page boundary position.
 *
 * @param pages - Page fragments in page order.
 * @param position - Document position to locate.
 * @param side - Boundary side preference.
 * @returns Boundary page, or null when the position is not a boundary.
 */
export function findQuireBoundaryPage(
  pages: readonly QuirePageFragment[],
  position: number,
  side: number
): QuirePageFragment | null {
  const boundaryPages = pages.filter((page) =>
    position === page.range.from || position === page.range.to
  );

  if (boundaryPages.length === 0) {
    return null;
  }

  const preferredBoundary = side < 0 ? "to" : "from";

  return boundaryPages.find((page) => page.range[preferredBoundary] === position)
    ?? boundaryPages[0]
    ?? null;
}

/**
 * Checks whether two non-empty document ranges overlap.
 *
 * @param first - First document range.
 * @param second - Second document range.
 * @returns Whether the ranges overlap.
 */
export function doQuireDocumentRangesIntersect(
  first: QuireDocumentRange,
  second: QuireDocumentRange
): boolean {
  return first.from < second.to && second.from < first.to;
}
