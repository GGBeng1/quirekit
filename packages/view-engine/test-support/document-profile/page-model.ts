import { quireNeutralDocumentProfile } from "../../src/document-profile";
import type { QuirePageModelProfile, QuirePageSection } from "../../src/document-profile";

/**
 * Creates a page section whose token carries only a starting page number.
 *
 * @param start - Number of the section's first physical page.
 * @returns Page section understood by the test page model.
 */
export function createTestPageSection(start: number): QuirePageSection {
  return { index: 0, position: 0, nodeType: "testSection", stableId: null, token: { start } };
}

/**
 * Creates a page model that exercises the engine's numbering delegation.
 *
 * The first page number comes from the section token and every number is
 * bracketed, so tests can tell that formatting came from the profile.
 *
 * @returns Neutral page model with observable numbering.
 */
export function createTestPageModel(): QuirePageModelProfile {
  return {
    ...quireNeutralDocumentProfile.pageModel,
    firstPageNumber: (section) => (section.token as { start: number }).start,
    formatPageNumber: (_section, value) => `[${value}]`
  };
}
