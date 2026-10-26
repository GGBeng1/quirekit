import type { ClassicEditorDocumentFontStatus, ClassicEditorImportedWebFontFamily } from "@classic/types";
import type { ClassicFontAvailabilityDiagnostic, ClassicFontOptionSource } from "./types";
import { normalizeClassicFontFamily } from "./identity";

export { readClassicFontFamily } from "./identity";
export { resolveClassicMarkedFontTarget, resolveClassicDocumentFontTarget, resolveClassicDocumentFontFamilies } from "./targets";
export type { ClassicFontTarget, ClassicFontPickerTarget, ClassicMarkedFontTarget, ClassicFontOptionSource, ClassicFontAvailabilityDiagnostic } from "./types";

/**
 * Matches a local imported family by CSS identity or provider display name.
 *
 * @param pattern - User-entered local query.
 * @param values - Candidate option values.
 * @returns Whether the option should remain visible.
 */
export function matchesClassicFontOption(
  pattern: string,
  values: readonly unknown[]
): boolean {
  const query = pattern.trim().toLocaleLowerCase();
  return query === "" || values.some((value) => (
    typeof value === "string" && value.toLocaleLowerCase().includes(query)
  ));
}

/**
 * Keeps the effective logical family as the first unique compact-picker row.
 *
 * @param currentFamily - Effective logical family, or null for mixed state.
 * @param documentDefaults - Document body defaults for the active script target.
 * @param importedFamilies - Imported provider records in product order.
 * @returns Current-first, default-preserving option sources without duplicates.
 */
export function projectClassicFontOptionSources<
  T extends { readonly family: string },
  M extends { readonly family: string } = { readonly family: string }
>(
  currentFamily: string | null,
  documentDefaults: readonly string[],
  importedFamilies: readonly T[],
  mountedFamilies: readonly M[] = []
): readonly ClassicFontOptionSource<T, M>[] {
  const options: ClassicFontOptionSource<T, M>[] = [];
  const optionByIdentity = new Map<string, number>();

  /**
   * Adds or upgrades one required logical row without changing stable order.
   *
   * @param family - Logical family.
   * @param current - Whether the selection currently resolves to this family.
   * @param documentDefault - Whether the document body theme owns this family.
   */
  function appendRequired(
    family: string,
    current: boolean,
    documentDefault: boolean
  ): void {
    const identity = normalizeClassicFontFamily(family);
    const existingIndex = optionByIdentity.get(identity);
    if (existingIndex !== undefined) {
      const existing = options[existingIndex];
      if (existing !== undefined) {
        options[existingIndex] = {
          ...existing,
          current: existing.current || current,
          documentDefault: existing.documentDefault || documentDefault
        };
      }
      return;
    }
    const mounted = mountedFamilies.find(
      (entry) => normalizeClassicFontFamily(entry.family) === identity
    );
    const imported = mounted === undefined
      ? importedFamilies.find(
          (entry) => normalizeClassicFontFamily(entry.family) === identity
        )
      : undefined;
    optionByIdentity.set(identity, options.length);
    options.push({
      family,
      imported,
      ...(mounted === undefined ? {} : { mounted }),
      current,
      documentDefault
    });
  }

  if (currentFamily !== null) appendRequired(currentFamily, true, false);
  for (const family of documentDefaults) appendRequired(family, false, true);
  for (const mounted of mountedFamilies) {
    appendRequired(mounted.family, false, false);
  }
  for (const imported of importedFamilies) {
    const identity = normalizeClassicFontFamily(imported.family);
    if (optionByIdentity.has(identity)) continue;
    optionByIdentity.set(identity, options.length);
    options.push({
      family: imported.family,
      imported,
      current: false,
      documentDefault: false
    });
  }
  return options;
}

/**
 * Resolves the authoritative warning kind for one logical font option.
 *
 * @param family - Logical family represented by the option.
 * @param status - Current document-body font resolution result.
 * @returns Missing-font diagnostic, or null when no warning is authoritative.
 */
export function resolveClassicFontAvailabilityDiagnostic(
  family: string,
  status: ClassicEditorDocumentFontStatus | undefined
): ClassicFontAvailabilityDiagnostic | null {
  if (
    status?.requestedFamily === null
    || status?.requestedFamily === undefined
    || normalizeClassicFontFamily(family)
      !== normalizeClassicFontFamily(status.requestedFamily)
  ) return null;
  return status.status === "substituted" || status.status === "unresolved"
    ? status.status
    : null;
}

/**
 * Creates a source-scoped select identity without changing CSS family identity.
 *
 * @param family - Imported provider record rendered by the compact picker.
 * @returns Collision-safe native select value.
 */
export function createClassicFontOptionKey(
  family: ClassicEditorImportedWebFontFamily
): string {
  return `family:${family.sourceId}\u0000${family.familyId ?? family.family}`;
}
