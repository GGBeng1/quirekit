import type {
  ClassicEditorFontLibrary,
  ClassicEditorWebFontFamily,
  ClassicEditorWebFontOptions
} from "../../../types";
import { createClassicEditorLocalFontLibraryPersistence } from "../../web-fonts";
import { createClassicFontLibraryApi } from "./api";
import { createClassicFontFamilyMap, createClassicImportedFontCatalog } from "./catalog";
import { createClassicWebFontInstallationController } from "./installation";
import { createClassicConfiguredWebFontLoader } from "./loader-factory";
import { createClassicWebFontSourceRegistry } from "./source-registry";

/** Inputs used to bind the product font library to one mounted document. */
export interface CreateClassicDocumentWebFontLibraryOptions {
  /** Browser document that owns registered faces. */
  readonly ownerDocument: Document;
  /** Host catalog policy, or `false` when disabled. */
  readonly webFonts: ClassicEditorWebFontOptions | false | undefined;
  /** Shared exact local-family probe. */
  readonly probeLocalFamily: (family: string) => Promise<boolean>;
  /** Product chrome refresh callback for loader phase changes. */
  readonly onStatusChange?: (() => void) | undefined;
  /** Callback invoked after one family becomes authoritative. */
  readonly onInstalled: (family: string) => void | Promise<void>;
}

/** Internal external-font authority owned by one document readiness lifecycle. */
export interface ClassicDocumentWebFontLibraryRuntime {
  /** Public product font library. */
  readonly library: ClassicEditorFontLibrary;
  /**
   * Reports whether this runtime made a family authoritative.
   *
   * @param family - Candidate family name.
   * @returns Whether installation completed for the family.
   */
  isInstalled(family: string): boolean;
  /** Destroys loader observers, browser registrations, and cache handles. */
  destroy(): void;
}

/**
 * Creates Classic's mounted searchable/importable font-library authority.
 *
 * @param options - Browser, catalog, probe, persistence, and lifecycle boundaries.
 * @returns Public library plus internal availability and cleanup controls.
 */
export function createClassicDocumentWebFontLibrary(
  options: CreateClassicDocumentWebFontLibraryOptions
): ClassicDocumentWebFontLibraryRuntime {
  const configured = options.webFonts === false ? undefined : options.webFonts;
  const persistence = configured?.persistence
    ?? createClassicEditorLocalFontLibraryPersistence();
  const persisted = persistence.load();
  const sourceRegistry = createClassicWebFontSourceRegistry(
    configured,
    configured === undefined ? [] : (persisted.customSources ?? []),
    configured === undefined ? [] : (persisted.stylesheetSources ?? [])
  );
  const { sources } = sourceRegistry;
  const curated = createClassicFontFamilyMap(configured?.families ?? []);
  const imported = createClassicFontFamilyMap(persisted.importedFamilies);
  const mountedFamilies = [...(configured?.mountedFamilies ?? [])];
  const recentFamilies = [...(persisted.recentFamilies ?? [])];
  const sourceSettings = new Map(Object.entries(persisted.sourceSettings));
  const preferredFamilies = new Map<string, ClassicEditorWebFontFamily>();
  const listeners = new Set<() => void>();
  let destroyed = false;

  const sourceCatalog = createClassicImportedFontCatalog(
    curated,
    imported,
    sources,
    sourceSettings,
    preferredFamilies
  );
  const loader = configured === undefined
    ? undefined
    : createClassicConfiguredWebFontLoader(
        configured,
        sourceCatalog,
        options.ownerDocument,
        options.probeLocalFamily
      );
  const unsubscribe = loader?.subscribe(notify);

  /** Notifies mounted product chrome after one library lifecycle change. */
  function notify(): void {
    if (destroyed) return;
    options.onStatusChange?.();
    for (const listener of listeners) listener();
  }

  /** Persists the complete source-settings and imported-family snapshot. */
  function persist(): void {
    const state = {
      sourceSettings: Object.fromEntries(sourceSettings),
      importedFamilies: [...imported.values()],
      recentFamilies: [...recentFamilies],
      customSources: [...sourceRegistry.customSources.values()],
      stylesheetSources: [...sourceRegistry.stylesheetSources.values()]
    };
    persistence.save(state);
    notify();
  }

  const installation = createClassicWebFontInstallationController({
    loader,
    curated,
    imported,
    preferred: preferredFamilies,
    persist,
    notify,
    isDestroyed: () => destroyed,
    onInstalled: options.onInstalled
  });

  const library = createClassicFontLibraryApi({
    curated,
    imported,
    mountedFamilies,
    recentFamilies,
    sourceRegistry,
    sourceSettings,
    loader,
    installation,
    hostCatalogCount: configured?.catalogs.length ?? 0,
    persist,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return (): void => {
        listeners.delete(listener);
      };
    }
  });

  installation.restoreImported();

  return {
    library,
    isInstalled: installation.isInstalled,
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      unsubscribe?.();
      listeners.clear();
      loader?.destroy();
    }
  };
}
