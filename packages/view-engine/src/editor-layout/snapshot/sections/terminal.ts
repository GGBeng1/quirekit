import type { QuireTerminalPlacement } from "@quirekit/layout/pagination";
import type { QuirePageSection } from "../../../document-profile/types";
import type { QuireLayoutBox, QuireLayoutDocument } from "../../../layout/engine/types";
import type { SectionLayoutProduct } from "./types";

/** @param box - Measured subtree. @param position - Exact source identity. @returns The region's measured table box, independent of its zero flow footprint. */
function measuredRegion(box: QuireLayoutBox, position: number): QuireLayoutBox | undefined {
  if (box.range.from === position && box.table) return box;
  if ("children" in box) for (const child of box.children as readonly QuireLayoutBox[]) {
    const found = measuredRegion(child, position);
    if (found) return found;
  }
  return undefined;
}

/**
 * Admits a measured final bottom region without repaginating preceding body content.
 * @param section - Explicit source-owned constraint.
 * @param probe - Once-measured independent terminal section.
 * @param previous - Last accepted physical body page.
 * @returns Fit and sharing facts; unsupported height/notes remain an explicit failed fit.
 */
export function resolveTerminalPlacement(section: QuirePageSection, probe: SectionLayoutProduct,
  previous: QuireLayoutDocument["pages"][number]): Pick<QuireTerminalPlacement, "fits" | "sharesPreviousPage"> {
  const constraint = section.terminalRegion!;
  const region = measuredRegion(probe.sourceDocument, constraint.range.from);
  const page = probe.document.pages[0]!;
  const height = region?.table?.rect.height ?? Infinity;
  const width = region?.table?.rect.width ?? Infinity;
  const notesBottom = Math.max(page.bodyRect.y, ...(page.endNoteAreas ?? []).map(area => area.rect.y + area.rect.height + constraint.separation));
  const fits = probe.document.pages.length === 1 && height <= page.bodyRect.y + page.bodyRect.height - notesBottom + 1e-6
    && width <= page.bodyRect.width + 1e-6;
  const sameSheet = Math.abs(previous.pageRect.width - page.pageRect.width) < 1e-6
    && Math.abs(previous.pageRect.height - page.pageRect.height) < 1e-6
    && Math.abs(previous.bodyRect.width - page.bodyRect.width) < 1e-6
    && Math.abs(previous.bodyRect.x - previous.pageRect.x - (page.bodyRect.x - page.pageRect.x)) < 1e-6
    && Math.abs(previous.bodyRect.y + previous.bodyRect.height - previous.pageRect.y
      - (page.bodyRect.y + page.bodyRect.height - page.pageRect.y)) < 1e-6;
  // Both the flow anchor and the visual table must fit. Page-local notes and
  // multicolumn bodies have different bottom ownership and cannot share here.
  const available = previous.bodyRect.y + previous.bodyRect.height - (previous.rect.y + previous.rect.height);
  const needed = Math.max(height + constraint.separation, page.rect.height);
  const parity = section.startPageParity === "odd" ? 1 : 0;
  return { fits, sharesPreviousPage: fits && sameSheet && (previous.pageIndex + 1) % 2 === parity
    && (page.endNoteAreas?.length ?? 0) === 0
    && (previous.columns?.length ?? 0) <= 1 && (previous.noteAreaHeight ?? 0) === 0
    && (previous.endNoteAreas?.length ?? 0) === 0 && available + 1e-6 >= needed };
}

/** @param product - Accepted section and its window projector. @param placement - Same decision used by pagination and export. @returns Product carrying immutable placement facts on its first page. */
export function retainTerminalPlacement(product: SectionLayoutProduct, placement: QuireTerminalPlacement): SectionLayoutProduct {
  /** @param document - Source or projected pages. @returns Pages annotated without changing positions or visible content. */
  const annotate = (document: QuireLayoutDocument): QuireLayoutDocument => ({ ...document,
    pages: document.pages.map((page, index) => index === 0 ? { ...page, terminalPlacement: placement } : page) });
  return { ...product, document: annotate(product.document), projectDocument: options => annotate(product.projectDocument(options)) };
}
