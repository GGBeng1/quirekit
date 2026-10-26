import type { QuireWebFontLoader } from "@quirekit/web-fonts";
import type {
  ClassicEditorFontLibrary,
  ClassicEditorImportedWebFontFamily,
  ClassicEditorMountedFontFamily,
  ClassicEditorWebFontFamily,
  ClassicEditorWebFontSourceSettings
} from "../../../types";
import {
  createClassicFontFamilyMap,
  mergeClassicKnownFontFamilies
} from "./catalog";
import {
  createClassicWebFontRecordKey,
  findClassicWebFontByCssFamily
} from "./family-identity";
import type { ClassicWebFontInstallationController } from "./installation";
import { browseClassicWebFontSource } from "./source-browse";
import type { ClassicWebFontSourceRegistry } from "./types";

/** Mutable dependencies behind the public mounted library API. */
interface CreateClassicFontLibraryApiOptions {
  /** Curated provider family records. */
  readonly curated: ReturnType<typeof createClassicFontFamilyMap<ClassicEditorWebFontFamily>>;
  /** Imported origin-local family records. */
  readonly imported: Map<string, ClassicEditorImportedWebFontFamily>;
  /** Application-mounted families that never require import. */
  readonly mountedFamilies: readonly ClassicEditorMountedFontFamily[];
  /** Mutable newest-first recent family list. */
  readonly recentFamilies: string[];
  /** Dynamic bundled-plus-custom source registry. */
  readonly sourceRegistry: ClassicWebFontSourceRegistry;
  /** Mutable origin-local settings by source. */
  readonly sourceSettings: Map<string, ClassicEditorWebFontSourceSettings>;
  /** Optional binary loader when external fonts are enabled. */
  readonly loader: QuireWebFontLoader | undefined;
  /** Exact-record install and restore lifecycle. */
  readonly installation: ClassicWebFontInstallationController;
  /** Number of host catalogs that may resolve curated families. */
  readonly hostCatalogCount: number;
  /** Persists one complete library snapshot and notifies observers. */
  readonly persist: () => void;
  /** Registers one public lifecycle listener. */
  readonly subscribe: ClassicEditorFontLibrary["subscribe"];
}

/**
 * Creates the public source, import, paging, and install API over one mount.
 *
 * @param options - Mutable maps plus loader, persistence, and lifecycle boundaries.
 * @returns Mounted public font-library authority.
 */
export function createClassicFontLibraryApi(
  options: CreateClassicFontLibraryApiOptions
): ClassicEditorFontLibrary {
  const { sources } = options.sourceRegistry;
  return {
    get families() {
      return mergeClassicKnownFontFamilies(options.curated, options.imported);
    },
    get sources() {
      return [...sources.values()];
    },
    get importedFamilies() {
      return [...options.imported.values()];
    },
    get mountedFamilies() {
      return [...options.mountedFamilies];
    },
    get recentFamilies() {
      return [...options.recentFamilies];
    },
    /** @inheritdoc */
    rememberRecentFamily(family): void {
      const normalized = family.trim();
      if (normalized.length === 0) return;
      const identity = normalizeFamily(normalized);
      const next = [
        normalized,
        ...options.recentFamilies.filter((entry) => normalizeFamily(entry) !== identity)
      ].slice(0, 5);
      if (
        next.length === options.recentFamilies.length
        && next.every((entry, index) => entry === options.recentFamilies[index])
      ) return;
      options.recentFamilies.splice(0, options.recentFamilies.length, ...next);
      options.persist();
    },
    /** @inheritdoc */
    getInstallations() {
      return options.installation.getInstallations();
    },
    subscribe: options.subscribe,
    /** @inheritdoc */
    getSourceSettings(sourceId) {
      return { ...(options.sourceSettings.get(sourceId) ?? {}) };
    },
    /** @inheritdoc */
    configureSource(sourceId, settings): void {
      if (!sources.has(sourceId)) throw new Error(`Unknown font source "${sourceId}".`);
      options.sourceSettings.set(sourceId, Object.fromEntries(
        Object.entries(settings).map(([key, value]) => [key, value.trim()])
      ));
      options.persist();
    },
    /** @inheritdoc */
    async search(sourceId, query, subsets) {
      const source = requireSource(sources, sourceId);
      return source.search({
        query,
        ...(subsets === undefined || subsets.length === 0 ? {} : { subsets }),
        settings: { ...(options.sourceSettings.get(sourceId) ?? {}) }
      });
    },
    /** @inheritdoc */
    async browse(sourceId, query, limit, cursor, subsets) {
      const source = requireSource(sources, sourceId);
      return browseClassicWebFontSource(source, {
        query,
        limit,
        ...(cursor === undefined ? {} : { cursor }),
        ...(subsets === undefined || subsets.length === 0 ? {} : { subsets }),
        settings: { ...(options.sourceSettings.get(sourceId) ?? {}) }
      });
    },
    /** @inheritdoc */
    inspectCustomSource: options.sourceRegistry.inspect,
    /** @inheritdoc */
    inspectStylesheetSource: options.sourceRegistry.inspectStylesheet,
    /** @inheritdoc */
    enableStylesheetSource(record): void {
      options.sourceRegistry.enableStylesheet(record);
      options.persist();
    },
    /** @inheritdoc */
    enableCustomSource(record): void {
      options.sourceRegistry.enable(record);
      options.persist();
    },
    /** @inheritdoc */
    removeCustomSource(sourceId): void {
      if (!options.sourceRegistry.remove(sourceId)) {
        throw new Error(`Unknown custom font source "${sourceId}".`);
      }
      options.sourceSettings.delete(sourceId);
      options.persist();
    },
    /** @inheritdoc */
    async previewFamily(family): Promise<void> {
      const retained = options.imported.get(createClassicWebFontRecordKey(family));
      if (!sources.has(family.sourceId) && !retained?.manifest && options.hostCatalogCount === 0) {
        throw new Error(`Unknown font source "${family.sourceId}".`);
      }
      await options.installation.preview(family);
    },
    /** @inheritdoc */
    async importFamily(family, download = true): Promise<void> {
      if (!sources.has(family.sourceId) && options.hostCatalogCount === 0) {
        throw new Error(`Unknown font source "${family.sourceId}".`);
      }
      const key = createClassicWebFontRecordKey(family);
      const existing = options.imported.get(key);
      const staged: ClassicEditorImportedWebFontFamily = {
        ...family,
        importedAt: existing?.importedAt ?? Date.now(),
        ...(existing?.manifest === undefined || existing.version !== family.version
          ? {}
          : { manifest: existing.manifest })
      };
      options.imported.set(key, staged);
      try {
        if (download) await options.installation.install(family);
        options.persist();
      } catch (error) {
        if (options.imported.get(key) === staged) {
          if (existing === undefined) options.imported.delete(key);
          else options.imported.set(key, existing);
          options.persist();
        }
        throw error;
      }
    },
    /** @inheritdoc */
    async removeFamily(family): Promise<void> {
      const entry = typeof family === "string"
        ? findClassicWebFontByCssFamily(options.imported, family)
        : options.imported.get(createClassicWebFontRecordKey(family));
      if (entry === undefined) return;
      await options.loader?.removeFamily(entry.family);
      options.imported.delete(createClassicWebFontRecordKey(entry));
      options.installation.forget(entry.family);
      options.persist();
    },
    /** @inheritdoc */
    getStatus(family) {
      return options.loader?.getStatus(family) ?? { family: family.trim(), phase: "idle" };
    },
    /** @inheritdoc */
    install: (family) => options.installation.install(family)
  };
}

/**
 * Normalizes one logical family for local recent-list comparison.
 *
 * @param family - Candidate CSS family.
 * @returns Stable case-insensitive identity.
 */
function normalizeFamily(family: string): string {
  return family.trim().toLocaleLowerCase("en-US");
}

/**
 * Resolves one configured source or throws a stable public diagnostic.
 *
 * @param sources - Mounted source registry.
 * @param sourceId - Stable source id.
 * @returns Configured source adapter.
 */
function requireSource(
  sources: ClassicWebFontSourceRegistry["sources"],
  sourceId: string
) {
  const source = sources.get(sourceId);
  if (source === undefined) throw new Error(`Unknown font source "${sourceId}".`);
  return source;
}
