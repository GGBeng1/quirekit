import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuirePageFragment } from "../types";
import type { QuireMeasuredContainerSourceFragment } from "../container";
import type { QuirePaginationSourceFragmentMatch } from "../query-types";
import { doQuireDocumentRangesIntersect } from "./page-range";

/**
 * Finds source fragments whose own ranges intersect a document range.
 *
 * @param pages - Page fragments to search in page order.
 * @param range - Document range to locate.
 * @returns Page/source-fragment matches in page order.
 */
export function findQuireSourceFragmentsIntersectingRange(
  pages: readonly QuirePageFragment[],
  range: QuireDocumentRange
): readonly QuirePaginationSourceFragmentMatch[] {
  if (range.to < range.from) {
    return [];
  }

  const matches: QuirePaginationSourceFragmentMatch[] = [];

  for (const page of pages) {
    for (const sourceFragment of page.sourceFragments ?? []) {
      if (doesQuireSourceFragmentIntersectRange(sourceFragment, range)) {
        matches.push({ page, sourceFragment });
      }
    }
  }

  return matches;
}

/**
 * Checks whether a source fragment owns any part of a range.
 *
 * @param sourceFragment - Source fragment to inspect.
 * @param range - Document range to locate.
 * @returns Whether the source fragment intersects the range.
 */
function doesQuireSourceFragmentIntersectRange(
  sourceFragment: QuireMeasuredContainerSourceFragment,
  range: QuireDocumentRange
): boolean {
  if (range.from === range.to) {
    return range.from >= sourceFragment.range.from
      && range.from <= sourceFragment.range.to;
  }

  return doQuireDocumentRangesIntersect(sourceFragment.range, range);
}
