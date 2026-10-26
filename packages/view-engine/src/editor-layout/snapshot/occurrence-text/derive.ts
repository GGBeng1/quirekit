import type { Node as PMNode } from "@quirekit/pm";
import { collectQuireSourceFlowPageBands } from "@quirekit/layout/pagination";
import type { QuirePageModelProfile } from "../../../document-profile/types";
import type { QuirePaginationTextDiagnostic } from "../../../layout/engine/types";
import type { SectionLayoutProduct } from "../sections/types";
import type { QuirePaginationTextDerivation } from "./types";
import { collectRepeatingPaginationTextRanges, findPaginationTextPage, isRepeatingPaginationTextSource } from "./pages";
import { resolveQuirePaginationTextValue } from "./value";

/** @param product - Complete source and section pagination, before window projection. @param model - Profile-owned page semantics. @param doc - Immutable canonical source. @returns Candidate strings from accepted full page facts, with preservation diagnostics. */
export function deriveQuirePaginationText(product: SectionLayoutProduct, model: QuirePageModelProfile, doc: PMNode): QuirePaginationTextDerivation {
  const values = new Map<string, string>(), diagnostics: QuirePaginationTextDiagnostic[] = [];
  if (!product.paginationTextSources?.some(source => source.sourceDocument.sourceCapabilities?.some(item => item.status === "resolved" && item.presentation.occurrenceText))) return { values, changed: false, diagnostics };
  let changed = false;
  const sources = (product.paginationTextSources ?? []).map(source => {
    const bands = collectQuireSourceFlowPageBands(source.paginatedDocument.pages);
    return { ...source, bands, repeating: collectRepeatingPaginationTextRanges(source.sourceDocument, bands) };
  });
  // Target anchors can belong to a section with no dependent text of its own.
  // Index full source facts before evaluating any cross-section request.
  const targets = new Map(sources.flatMap(source => source.sourceDocument.anchors.map(anchor => [anchor.position.pos, { source, anchor }] as const)));
  for (const source of sources) {
    const capabilities = new Map((source.sourceDocument.sourceCapabilities ?? []).map(item => [item.sourceAnchorId, item]));
    for (const anchor of source.sourceDocument.anchors) {
      const capability = capabilities.get(anchor.sourceAnchorId);
      const recipe = capability?.status === "resolved" ? capability.presentation.occurrenceText : undefined;
      if (!recipe || capability?.status !== "resolved" || capability.presentation.view.kind !== "text") continue;
      const position = anchor.position.pos;
      /** @param code - Stable preservation reason. @param message - Observable explanation. */
      const reject = (code: QuirePaginationTextDiagnostic["code"], message: string): void => {
        diagnostics.push({ sourceAnchorId: anchor.sourceAnchorId, position, code, message });
      };
      if (isRepeatingPaginationTextSource(source.repeating, position)) {
        reject("repeated-pagination-text-source", "Repeated table-header text retains its source result until occurrence-specific measurement is admitted.");
        continue;
      }
      // PM page ranges may include a whole table row. The infinite-flow line
      // origin selects the actual page/column without reading paint commands.
      const target = recipe.referencePosition === undefined ? { source, anchor }
        : recipe.referencePosition === null ? undefined : targets.get(recipe.referencePosition);
      if (!target) {
        reject("missing-pagination-text-reference", "The referenced source anchor is unavailable; the stored result is retained.");
        continue;
      }
      if (isRepeatingPaginationTextSource(target.source.repeating, target.anchor.position.pos)) {
        reject("repeated-pagination-text-reference", "The referenced source repeats on multiple pages; the stored result is retained.");
        continue;
      }
      const pageIndex = findPaginationTextPage(target.source.bands, target.anchor.placementReferences.line.y);
      if (pageIndex === null) {
        reject("missing-pagination-text-page", "No complete source-flow page band owns this text; its stored result is retained.");
        continue;
      }
      const sourcePage = findPaginationTextPage(source.bands, anchor.placementReferences.line.y);
      const reference = recipe.referencePosition === undefined || sourcePage === null ? undefined : {
        samePage: (source.physicalPageOffset ?? 0) + sourcePage === (target.source.physicalPageOffset ?? 0) + pageIndex,
        sourcePosition: position, targetPosition: target.anchor.position.pos
      };
      const value = resolveQuirePaginationTextValue(recipe, target.source.section, { pageIndex, reference,
        pageCount: product.document.pages.length, sectionNumber: target.source.sectionNumber,
        sectionPageCount: target.source.paginatedDocument.pages.length, documentNode: doc }, model);
      if (value === null) {
        reject("unsupported-pagination-text-context", "The document profile retains this stored result for an unsupported pagination policy.");
        continue;
      }
      values.set(anchor.sourceAnchorId, value);
      changed ||= capability.presentation.view.text !== value;
    }
  }
  return { values, changed, diagnostics };
}
