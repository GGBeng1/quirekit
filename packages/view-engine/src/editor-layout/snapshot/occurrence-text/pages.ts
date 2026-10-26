import { findQuireSourceFlowPage as findPaginationTextPage } from "@quirekit/layout/pagination";
export { findQuireSourceFlowPage as findPaginationTextPage, isQuireSourcePositionInRanges as isRepeatingPaginationTextSource } from "@quirekit/layout/pagination";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireLayoutBox } from "../../../layout/engine/types";
import type { PaginationTextBand } from "./types";

/** @param box - Complete source tree. @param bands - Full pagination bands. @returns Merged source ranges whose table headers can repeat on multiple pages. */
export function collectRepeatingPaginationTextRanges(box: QuireLayoutBox, bands: readonly PaginationTextBand[]): readonly QuireDocumentRange[] {
  const ranges: QuireDocumentRange[] = [];
  /** @param current - Source box in infinite-flow coordinates. */
  function visit(current: QuireLayoutBox): void {
    if (current.table && findPaginationTextPage(bands, current.rect.y) !== findPaginationTextPage(bands, current.rect.y + current.rect.height - 0.01)) {
      ranges.push(...current.table.rows.filter(row => row.isHeader).map(row => row.range));
    }
    if ("children" in current) for (const child of current.children as readonly QuireLayoutBox[]) visit(child);
  }
  visit(box);
  const merged: QuireDocumentRange[] = [];
  for (const range of ranges.sort((a, b) => a.from - b.from)) {
    const last = merged.at(-1);
    if (last && range.from <= last.to) merged[merged.length - 1] = { from: last.from, to: Math.max(last.to, range.to) };
    else merged.push(range);
  }
  return merged;
}
