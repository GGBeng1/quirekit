import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuirePageFragment } from "./types";
import type { QuireMeasuredContainerSourceFragment } from "./container";

/** Source-fragment match returned by pagination provenance queries. */
export interface QuirePaginationSourceFragmentMatch {
  /** Page fragment that accepted the source fragment. */
  readonly page: QuirePageFragment;
  /** Source fragment accepted by the page. */
  readonly sourceFragment: QuireMeasuredContainerSourceFragment;
}

/** Snapshot-local query index derived from page fragments. */
export interface QuirePaginationQueryIndex {
  /** Page fragments sorted by page index. */
  readonly pages: readonly QuirePageFragment[];
  /**
   * Finds a page fragment by its zero-based page index.
   *
   * @param pageIndex - Page index to find.
   * @returns Matching page fragment, or null when no page exists.
   */
  findPageByIndex(pageIndex: number): QuirePageFragment | null;
  /**
   * Finds the page that owns a document position.
   *
   * @param position - Document position to locate.
   * @param side - Boundary side preference, matching ProseMirror geometry APIs.
   * @returns Matching page fragment, or null when the position is outside all pages.
   */
  findPageAtDocumentPosition(position: number, side?: number): QuirePageFragment | null;
  /**
   * Finds all pages whose document ranges intersect a range.
   *
   * @param range - Document range to locate.
   * @returns Page fragments intersecting the range in page order.
   */
  findPagesIntersectingRange(range: QuireDocumentRange): readonly QuirePageFragment[];
  /**
   * Finds source fragments accepted by a page.
   *
   * @param pageIndex - Page index whose source fragments should be returned.
   * @returns Source fragments accepted by the page, or an empty list.
   */
  findSourceFragmentsByPageIndex(
    pageIndex: number
  ): readonly QuireMeasuredContainerSourceFragment[];
  /**
   * Finds source fragments whose own document ranges intersect a range.
   *
   * This intentionally matches against source-fragment ranges rather than page
   * ranges, so diagnostics and future recursive containers do not treat a broad
   * page envelope as proof that a child fragment belongs to that page.
   *
   * @param range - Document range to locate.
   * @returns Page/source-fragment matches in page order.
   */
  findSourceFragmentsIntersectingRange(
    range: QuireDocumentRange
  ): readonly QuirePaginationSourceFragmentMatch[];
}
