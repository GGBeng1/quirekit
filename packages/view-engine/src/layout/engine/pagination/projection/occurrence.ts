import type { QuirePageBodyProjection } from "./types";

/**
 * Resolves the identity used to name boxes projected by one page projection.
 *
 * Single-column pages keep the bare page index so their ids are unchanged; the
 * columns of one page add the column index because one source box can split
 * across two columns of the same page.
 *
 * @param projection - Page or column projection.
 * @returns Occurrence key unique among the document's projections.
 */
export function resolveQuireProjectionOccurrence(
  projection: Pick<QuirePageBodyProjection, "page" | "columnIndex">
): string {
  return projection.columnIndex === undefined
    ? String(projection.page.pageIndex)
    : `${projection.page.pageIndex}c${projection.columnIndex}`;
}
