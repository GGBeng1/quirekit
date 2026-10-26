import type { QuirePageSection } from "../../../document-profile/types";
import type { QuireLayoutDocument } from "../../../layout/engine/types";
import { createQuirePaginatedDocumentRect } from "../../../layout/engine/pagination/document-rect";
import type { SectionLayoutProduct } from "./types";

/**
 * Checks a following section's physical-sheet constraint independently of folios.
 * @param section - Model-neutral section handle.
 * @param acceptedPages - Number of physical sheets already accepted.
 * @returns Whether exactly one blank sheet is needed before the section.
 */
export function needsSectionPaddingPage(section: QuirePageSection, acceptedPages: number): boolean {
  if (acceptedPages === 0 || section.continuesPreviousPage || section.startPageParity === undefined) return false;
  return (acceptedPages + 1) % 2 !== (section.startPageParity === "odd" ? 1 : 0);
}

/**
 * Extends the preceding section with one unpainted physical sheet.
 * @param product - Previous section's accepted source and retained projector.
 * @param pageIndex - Document-global index of the new empty sheet.
 * @param y - Document-space paper origin, including the preceding page gap.
 * @returns Product with updated page facts, without new source or interaction nodes.
 */
export function appendSectionPaddingPage(product: SectionLayoutProduct, pageIndex: number, y: number): SectionLayoutProduct {
  const previous = product.document.pages.at(-1)!;
  const dy = y - previous.pageRect.y;
  const bodyRect = { ...previous.bodyRect, y: previous.bodyRect.y + dy };
  const blank: QuireLayoutDocument["pages"][number] = {
    pageIndex,
    range: { from: previous.range.to, to: previous.range.to },
    pageRect: { ...previous.pageRect, y }, bodyRect,
    rect: { ...bodyRect, height: 0 },
    sourceFlowY: (previous.sourceFlowY ?? previous.bodyRect.y) + (previous.sourceFlowHeight ?? previous.rect.height),
    sourceFlowHeight: 0,
    endInfo: previous.endInfo
  };
  /** @param document - Raw or already projected section. @returns The same products with an additional empty sheet. */
  const append = (document: QuireLayoutDocument): QuireLayoutDocument => {
    const pages = [...document.pages, blank];
    return { ...document, pages, rect: createQuirePaginatedDocumentRect(document.rect, pages) };
  };
  // Padding participates in pagination facts before convergence, but is attached
  // after the original projector so it cannot duplicate page bands or hit targets.
  return {
    ...product,
    document: append(product.document),
    ...(product.paginationTextSources === undefined ? {} : {
      paginationTextSources: product.paginationTextSources.map(source => ({ ...source, paginatedDocument: append(source.paginatedDocument) }))
    }),
    projectDocument: options => append(product.projectDocument(options))
  };
}
