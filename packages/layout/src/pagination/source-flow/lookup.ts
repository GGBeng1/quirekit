import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireSourceFlowPageBand } from "./types";

/** @param bands - Complete sorted bands. @param y - Infinite-flow line origin. @returns Owning section-local page, or null for missing facts. */
export function findQuireSourceFlowPage(bands: readonly QuireSourceFlowPageBand[], y: number): number | null {
  let low = 0, high = bands.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (bands[middle]!.from <= y + 0.001) low = middle + 1;
    else high = middle;
  }
  const band = bands[low - 1];
  return band && y < band.to + 0.001 ? band.pageIndex : null;
}

/** @param ranges - Sorted disjoint repeating ranges. @param position - Canonical source position. @returns Whether one source can have distinct repeated page occurrences. */
export function isQuireSourcePositionInRanges(ranges: readonly QuireDocumentRange[], position: number): boolean {
  let low = 0, high = ranges.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (ranges[middle]!.from <= position) low = middle + 1;
    else high = middle;
  }
  return ranges[low - 1] !== undefined && position < ranges[low - 1]!.to;
}
