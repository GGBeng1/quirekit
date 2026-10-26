import {
  normalizeQuireWebFontFamily,
  type QuireWebFontCatalog
} from "@quirekit/web-fonts";
import type {
  ClassicEditorImportedWebFontFamily,
  ClassicEditorWebFontFamily,
  ClassicEditorWebFontSource,
  ClassicEditorWebFontSourceSettings
} from "../../../types";
import {
  createClassicWebFontRecordKey,
  findClassicWebFontByCssFamily
} from "./family-identity";

/**
 * Creates a catalog that resolves only locally known families.
 *
 * @param curated - Product recommendations.
 * @param imported - Origin-local imports.
 * @param sources - Search and resolution adapters.
 * @param settings - Current source settings.
 * @param preferred - Exact record selected by an active import operation.
 * @returns Dynamic catalog used by explicit installs.
 */
export function createClassicImportedFontCatalog(
  curated: ReadonlyMap<string, ClassicEditorWebFontFamily>,
  imported: ReadonlyMap<string, ClassicEditorImportedWebFontFamily>,
  sources: ReadonlyMap<string, ClassicEditorWebFontSource>,
  settings: ReadonlyMap<string, ClassicEditorWebFontSourceSettings>,
  preferred: ReadonlyMap<string, ClassicEditorWebFontFamily> = new Map()
): QuireWebFontCatalog {
  return {
    id: "classic-font-hub",
    /** @inheritdoc */
    async resolveFamily(family: string) {
      const preferredEntry = preferred.get(normalizeQuireWebFontFamily(family));
      const preferredImported = preferredEntry === undefined
        ? undefined
        : imported.get(createClassicWebFontRecordKey(preferredEntry));
      const importedEntry = preferredImported
        ?? findClassicWebFontByCssFamily(imported, family);
      if (importedEntry?.manifest !== undefined) return importedEntry.manifest;
      const entry = preferredEntry
        ?? importedEntry
        ?? findClassicWebFontByCssFamily(curated, family);
      if (entry === undefined) return null;
      const source = sources.get(entry.sourceId);
      if (source === undefined) return null;
      return source.resolveFamily({
        family: entry,
        settings: { ...(settings.get(entry.sourceId) ?? {}) }
      });
    }
  };
}

/**
 * Indexes families by normalized identity, keeping the last local record.
 *
 * @param families - Curated or imported family records.
 * @returns Lookup map.
 */
export function createClassicFontFamilyMap<T extends ClassicEditorWebFontFamily>(
  families: readonly T[]
): Map<string, T> {
  return new Map(families.map((family) => [
    createClassicWebFontRecordKey(family),
    family
  ]));
}

/**
 * Merges curated and imported families without duplicate normalized names.
 *
 * @param curated - Product recommendations.
 * @param imported - Origin-local imports.
 * @returns Stable family list with imported metadata taking precedence.
 */
export function mergeClassicKnownFontFamilies(
  curated: ReadonlyMap<string, ClassicEditorWebFontFamily>,
  imported: ReadonlyMap<string, ClassicEditorImportedWebFontFamily>
): readonly ClassicEditorWebFontFamily[] {
  const byCssFamily = new Map<string, ClassicEditorWebFontFamily>();
  for (const family of [...curated.values(), ...imported.values()]) {
    byCssFamily.set(family.family.trim().toLocaleLowerCase("en-US"), family);
  }
  return [...byCssFamily.values()];
}
