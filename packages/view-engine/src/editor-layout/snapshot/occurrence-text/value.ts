import type { QuirePageModelProfile, QuirePageSection } from "../../../document-profile/types";
import type { QuireInlineSourceOccurrenceText } from "../../../layout/engine/inline/source-capability";
import type { QuirePaginationTextFacts } from "./types";

/** @param recipe - Neutral physical-fact request. @param section - Effective numbering owner. @param facts - Complete pagination context. @param model - Profile-owned formatting authority. @returns Display text, or null for a preserved-only context. */
export function resolveQuirePaginationTextValue(recipe: QuireInlineSourceOccurrenceText, section: QuirePageSection | null, facts: QuirePaginationTextFacts, model: QuirePageModelProfile): string | null {
  if (recipe.kind === "page-source-text") return facts.documentNode && facts.bodyRanges
    ? model.formatPageSourceText?.(facts.documentNode, recipe.formatToken, facts.bodyRanges) ?? null : null;
  const value = recipe.kind === "section-page-number" ? (section ? model.firstPageNumber(section) : 1) + facts.pageIndex
    : recipe.kind === "document-page-count" ? facts.pageCount
      : recipe.kind === "section-number" ? facts.sectionNumber : facts.sectionPageCount;
  // Legacy neutral consumers retain their numbering formatter. New source-owned
  // tokens deliberately distinguish page-number defaults from count defaults.
  if (recipe.formatToken === undefined) return section ? model.formatPageNumber(section, value) : String(value);
  return model.formatPaginationText?.(section, value, recipe.formatToken, facts.documentNode, facts.reference) ?? (model.formatPaginationText ? null : String(value));
}
