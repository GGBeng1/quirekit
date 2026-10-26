import type { QuireLayoutDocument } from "../../../layout/engine/types";
import { mergeQuireRetainedRegionProductSets } from "../../../layout/region-products";
import { createQuirePaginatedDocumentRect } from "../../../layout/engine/pagination/document-rect";

/**
 * Combines section products already projected into one document coordinate space.
 * @param documents - Nonempty source-ordered section layouts; consecutive sections may share one page index.
 * @returns One complete page stack retaining every geometry and interaction product.
 */
export function mergeSectionDocuments(documents: readonly QuireLayoutDocument[]): QuireLayoutDocument {
  const first = documents[0]!;
  const last = documents.at(-1)!;
  const pages = mergeSharedPages(documents.flatMap(document => document.pages));
  return {
    ...first,
    range: { from: first.range.from, to: last.range.to },
    rect: createQuirePaginatedDocumentRect(first.rect, pages), pages,
    children: documents.flatMap(document => document.children),
    anchors: documents.flatMap(document => document.anchors),
    hitTargets: documents.flatMap(document => document.hitTargets),
    sourceCapabilities: documents.flatMap(document => document.sourceCapabilities ?? []),
    anchorOccurrenceGaps: documents.flatMap(document => document.anchorOccurrenceGaps),
    anchorPlacementGaps: documents.flatMap(document => document.anchorPlacementGaps),
    flowExclusionGaps: documents.flatMap(document => document.flowExclusionGaps ?? []),
    anchorRegionProducts: mergeQuireRetainedRegionProductSets(documents.map(document => document.anchorRegionProducts)) ?? first.anchorRegionProducts
  };
}

/**
 * Folds fragments of continuing sections into the physical page they share.
 *
 * The merged page spans both sections' document ranges and body bands; each
 * section keeps its own projected boxes, so only page-level facts are combined.
 *
 * @param pages - Section page fragments in source order.
 * @returns One fragment per physical page.
 */
function mergeSharedPages(pages: readonly QuireLayoutDocument["pages"][number][]): QuireLayoutDocument["pages"][number][] {
  const merged: QuireLayoutDocument["pages"][number][] = [];
  for (const page of pages) {
    const previous = merged.at(-1);
    if (previous?.pageIndex !== page.pageIndex) {
      merged.push(page);
      continue;
    }
    const top = Math.min(previous.bodyRect.y, page.bodyRect.y);
    const bottom = Math.max(previous.bodyRect.y + previous.bodyRect.height, page.bodyRect.y + page.bodyRect.height);
    const separators = [...(previous.columnSeparators ?? []), ...(page.columnSeparators ?? [])];
    const noteSeparators = [...(previous.noteSeparators ?? []), ...(page.noteSeparators ?? [])];
    const noteRanges = [...(previous.noteRanges ?? []), ...(page.noteRanges ?? [])];
    merged[merged.length - 1] = {
      ...previous,
      range: { from: previous.range.from, to: page.range.to },
      ...(page.terminalPlacement === undefined ? {} : { terminalPlacement: page.terminalPlacement }),
      bodyRect: { ...previous.bodyRect, y: top, height: bottom - top },
      ...(separators.length === 0 ? {} : { columnSeparators: separators }),
      ...(noteSeparators.length === 0 ? {} : { noteSeparators }),
      ...(noteRanges.length === 0 ? {} : { noteRanges })
    };
  }
  return merged;
}
