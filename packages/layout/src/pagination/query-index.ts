import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuirePageFragment } from "./types";
import type { QuireMeasuredContainerSourceFragment } from "./container";
import type {
  QuirePaginationQueryIndex,
  QuirePaginationSourceFragmentMatch
} from "./query-types";
import {
  doQuireDocumentRangesIntersect,
  findQuireBoundaryPage
} from "./query-index/page-range";
import { findQuireSourceFragmentsIntersectingRange } from "./query-index/source-fragments";

/**
 * Creates a snapshot-local page query index from pagination records.
 *
 * @param pages - Page fragments produced by the pagination pass.
 * @returns Query index for page/range lookup.
 */
export function createQuirePaginationQueryIndex(
  pages: readonly QuirePageFragment[]
): QuirePaginationQueryIndex {
  return new QuirePageFragmentQueryIndex(pages);
}

/** Page-fragment query index scoped to one layout snapshot. */
class QuirePageFragmentQueryIndex implements QuirePaginationQueryIndex {
  /** Page fragments sorted by page index. */
  readonly pages: readonly QuirePageFragment[];

  private readonly pagesByIndex: ReadonlyMap<number, QuirePageFragment>;

  /**
   * Creates a page-fragment query index.
   *
   * @param pages - Page fragments produced by pagination.
   */
  constructor(pages: readonly QuirePageFragment[]) {
    this.pages = [...pages].sort((first, second) => first.pageIndex - second.pageIndex);
    this.pagesByIndex = new Map(this.pages.map((page) => [page.pageIndex, page]));
  }

  /**
   * Finds a page fragment by page index.
   *
   * @param pageIndex - Page index to find.
   * @returns Matching page fragment, or null.
   */
  findPageByIndex(pageIndex: number): QuirePageFragment | null {
    return this.pagesByIndex.get(pageIndex) ?? null;
  }

  /**
   * Finds the page that owns a document position.
   *
   * @param position - Document position to locate.
   * @param side - Boundary side preference.
   * @returns Matching page fragment, or null.
   */
  findPageAtDocumentPosition(
    position: number,
    side = 1
  ): QuirePageFragment | null {
    const boundaryPage = findQuireBoundaryPage(this.pages, position, side);

    if (boundaryPage !== null) {
      return boundaryPage;
    }

    return this.pages.find((page) =>
      position > page.range.from && position < page.range.to
    ) ?? null;
  }

  /**
   * Finds pages whose document ranges intersect a range.
   *
   * @param range - Document range to locate.
   * @returns Intersecting page fragments.
   */
  findPagesIntersectingRange(
    range: QuireDocumentRange
  ): readonly QuirePageFragment[] {
    if (range.to < range.from) {
      return [];
    }

    if (range.from === range.to) {
      const page = this.findPageAtDocumentPosition(range.from, 1);

      return page === null ? [] : [page];
    }

    return this.pages.filter((page) =>
      doQuireDocumentRangesIntersect(page.range, range)
    );
  }

  /**
   * Finds source fragments accepted by one page.
   *
   * @param pageIndex - Page index whose source fragments should be returned.
   * @returns Source fragments accepted by the page.
   */
  findSourceFragmentsByPageIndex(
    pageIndex: number
  ): readonly QuireMeasuredContainerSourceFragment[] {
    return this.findPageByIndex(pageIndex)?.sourceFragments ?? [];
  }

  /**
   * Finds source fragments whose own ranges intersect a document range.
   *
   * @param range - Document range to locate.
   * @returns Page/source-fragment matches in page order.
   */
  findSourceFragmentsIntersectingRange(
    range: QuireDocumentRange
  ): readonly QuirePaginationSourceFragmentMatch[] {
    return findQuireSourceFragmentsIntersectingRange(this.pages, range);
  }
}
