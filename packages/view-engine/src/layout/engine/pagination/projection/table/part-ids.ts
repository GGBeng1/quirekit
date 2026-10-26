import { doQuireDocumentRangesIntersect } from "@quirekit/renderer";
import type { QuireDocumentRange } from "@quirekit/renderer";

/**
 * Creates the suffix for a split table part on one page.
 *
 * @param pageIndex - Page index receiving the split part.
 * @returns Stable split-page suffix.
 */
export function createQuireSplitTablePartSuffix(pageIndex: number | string): string {
  return `#p${pageIndex}`;
}

/**
 * Creates the suffix for a repeated table header part on one page.
 *
 * @param pageIndex - Page index receiving the repeated header part.
 * @returns Stable repeated-header suffix.
 */
export function createQuireRepeatedHeaderTablePartSuffix(pageIndex: number | string): string {
  return `:repeat-p${pageIndex}`;
}

/**
 * Creates a stable id for a page-local table body part.
 *
 * @param id - Source table part id.
 * @param sourceRange - Source range represented before projection.
 * @param pageRange - Page range being projected.
 * @param pageIndex - Page index receiving the projected part.
 * @returns Source id or a page-suffixed id when the source range was split.
 */
export function createQuireSplitTablePartId(
  id: string,
  sourceRange: QuireDocumentRange,
  pageRange: QuireDocumentRange,
  pageIndex: number | string
): string {
  if (!doQuireDocumentRangesIntersect(sourceRange, pageRange)) {
    return `${id}${createQuireSplitTablePartSuffix(pageIndex)}`;
  }

  return pageRange.from > sourceRange.from || pageRange.to < sourceRange.to
    ? `${id}${createQuireSplitTablePartSuffix(pageIndex)}`
    : id;
}

/**
 * Creates a page-stable id for a repeated table header part.
 *
 * @param id - Source table part id.
 * @param pageIndex - Page index receiving the repeated part.
 * @returns Repeated header id.
 */
export function createQuireRepeatedHeaderTablePartId(
  id: string,
  pageIndex: number | string
): string {
  return `${id}${createQuireRepeatedHeaderTablePartSuffix(pageIndex)}`;
}

/**
 * Resolves the source table part id represented by a page-local part id.
 *
 * @param id - Page-local table part id.
 * @param pageIndex - Page index that produced the id.
 * @returns Source table part id with known page-local suffixes stripped.
 */
export function resolveQuireTablePartSourceId(
  id: string,
  pageIndex: number | string
): string {
  for (const suffix of [
    createQuireSplitTablePartSuffix(pageIndex),
    createQuireRepeatedHeaderTablePartSuffix(pageIndex)
  ]) {
    if (id.endsWith(suffix)) {
      return id.slice(0, -suffix.length);
    }
  }

  return id;
}

/**
 * Resolves the suffix appended to nested children for one projected table part.
 *
 * @param projectedPartId - Page-local table part id.
 * @param sourcePartId - Source table part id.
 * @returns Stable suffix for nested projected child ids.
 */
export function resolveQuireTablePartChildSuffix(
  projectedPartId: string,
  sourcePartId: string
): string {
  return projectedPartId.startsWith(sourcePartId)
    ? projectedPartId.slice(sourcePartId.length)
    : "";
}
