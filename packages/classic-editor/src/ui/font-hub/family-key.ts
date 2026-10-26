import type { ClassicEditorWebFontFamily } from "@classic/types";

/**
 * Builds one source-scoped UI operation key with legacy-family fallback.
 *
 * @param family - Provider family metadata.
 * @returns Collision-safe UI identity.
 */
export function createClassicFontHubFamilyKey(
  family: ClassicEditorWebFontFamily
): string {
  const familyId = family.familyId?.trim()
    || family.family.trim().toLocaleLowerCase("en-US");
  return `${family.sourceId}\u0000${familyId}`;
}
