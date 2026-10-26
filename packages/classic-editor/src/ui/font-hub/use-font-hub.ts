import {
  computed,
  ref,
  watch,
  type ComputedRef,
  type Ref
} from "vue";
import type {
  ClassicEditorFontHubMessageKey,
  ClassicEditorFontLibrary,
  ClassicEditorWebFontFamily,
  ClassicEditorWebFontSource
} from "@classic/types";
import { createClassicFontHubFamilyKey } from "./family-key";
import { createClassicFontHubOperations } from "./operations";
import { useClassicFontCatalog } from "./catalog/controller";
import { useFontSourceSettings } from "./sources/settings";
import {
  isClassicFontScriptFilterId,
  resolveClassicFontScriptFilterSubsets,
  type ClassicFontScriptFilterId
} from "./font-preview";

/** Top-level views owned by the source-neutral font Hub. */
export type ClassicFontHubView = "catalog" | "imported" | "sources";

/**
 * Creates provider-neutral interaction state for the public font Hub.
 *
 * @param open - Controlled dialog visibility.
 * @param library - Optional mounted font-library authority.
 * @param message - Resolved product-copy function.
 * @param sourceLabel - Source-label localization function.
 * @returns Reactive view, source, search, import, and settings bindings.
 */
export function useClassicFontHub(
  open: Readonly<Ref<boolean>>,
  library: ComputedRef<ClassicEditorFontLibrary | undefined>,
  message: (key: ClassicEditorFontHubMessageKey) => string,
  sourceLabel: (source: ClassicEditorWebFontSource) => string
) {
  const activeView = ref<ClassicFontHubView>("catalog");
  const selectedSourceId = ref(library.value?.families.length ? "" : library.value?.sources[0]?.id ?? "");
  const scriptFilter = ref<ClassicFontScriptFilterId>("all");
  const pendingFamilies = ref<ReadonlySet<string>>(new Set());
  const previewingFamilies = ref<ReadonlySet<string>>(new Set());
  const downloadOnImport = ref(true);
  const importingRecommended = ref(false);
  const feedback = ref("");
  const feedbackTone = ref<"error" | "success">("error");
  const revision = ref(0);

  const sources = computed(() => {
    revision.value;
    return library.value?.sources ?? [];
  });
  const selectedSource = computed(() => sources.value.find(
    (source) => source.id === selectedSourceId.value
  ));
  const sourceOptions = computed(() => sources.value.map((source) => ({
    label: sourceLabel(source),
    value: source.id
  })));
  const importedFamilies = computed(() => {
    revision.value;
    return library.value?.importedFamilies ?? [];
  });
  const importedKeys = computed(() => new Set(importedFamilies.value.map(
    createClassicFontHubFamilyKey
  )));
  const importedFamilyIdentities = computed(() => new Set(
    importedFamilies.value.map((family) => normalizeFamily(family.family))
  ));
  const mountedFamilyIdentities = computed(() => new Set(
    (library.value?.mountedFamilies ?? []).map((family) => normalizeFamily(family.family))
  ));
  const curatedResults = computed(() => {
    revision.value;
    return (library.value?.families ?? []).filter(
      (family) => !selectedSourceId.value || family.sourceId === selectedSourceId.value
    );
  });
  const isRecommended = computed(() => selectedSourceId.value === "");
  const addableRecommendedFamilies = computed(() => (
    isRecommended.value
      ? curatedResults.value.filter((family) => !isAvailable(family))
      : []
  ));
  const catalogOptions = computed(() => [
    { label: message("recommendedFonts"), value: "" }, ...sourceOptions.value
  ]);
  const selectedSubsets = computed(() => (
    resolveClassicFontScriptFilterSubsets(scriptFilter.value)
  ));
  const catalog = useClassicFontCatalog({
    library,
    selectedSource,
    curatedResults,
    selectedSubsets
  });

  const operations = createClassicFontHubOperations({
    library,
    pendingFamilies,
    previewingFamilies,
    downloadOnImport,
    feedback,
    feedbackTone,
    revision,
    message
  });
  const sourceSettings = useFontSourceSettings(library, sources, message, sourceId => {
    revision.value += 1;
    if (sourceId !== selectedSourceId.value) return;
    catalog.hasSearched.value = false;
    catalog.resetResults();
    void loadDefaultCatalog();
  });
  const needsConfiguration = computed(() => {
    revision.value;
    const current = selectedSource.value;
    const persisted = current ? library.value?.getSourceSettings(current.id) ?? {} : {};
    return current?.settingFields.some(field => field.required && !persisted[field.key]?.trim()) ?? false;
  });

  /**
   * Loads a configured source's complete directory for default browsing.
   *
   * @returns Completion after a required-settings check and optional search.
   */
  async function loadDefaultCatalog(): Promise<void> {
    const source = selectedSource.value;
    const currentLibrary = library.value;
    if (
      !open.value
      || source === undefined
      || currentLibrary === undefined
      || catalog.hasSearched.value
      || catalog.searching.value
    ) return;
    if (needsConfiguration.value) return;
    await catalog.searchFonts();
  }

  watch(library, (currentLibrary, _previousLibrary, onCleanup) => {
    if (currentLibrary === undefined) return;
    onCleanup(currentLibrary.subscribe(() => {
      revision.value += 1;
    }));
  }, { immediate: true });

  watch([open, sources], ([isOpen, currentSources]) => {
    if (!isOpen) { catalog.invalidate(); return; }
    if (selectedSourceId.value && !currentSources.some((source) => source.id === selectedSourceId.value)) {
      selectedSourceId.value = currentSources[0]?.id ?? "";
    }
    void loadDefaultCatalog();
  }, { immediate: true });

  watch(selectedSourceId, () => {
    catalog.query.value = "";
    catalog.resetResults();
    catalog.hasSearched.value = false;
    feedback.value = "";
    void loadDefaultCatalog();
  });

  /**
   * Selects one top-level management view.
   *
   * @param view - Catalog, imported-family, or source-management view.
   */
  function selectView(view: ClassicFontHubView): void {
    activeView.value = view;
    feedback.value = "";
    if (view === "catalog") void loadDefaultCatalog();
  }

  /**
   * Applies one language/script filter and reloads the first provider page.
   *
   * @param value - Stable select value from the shared script registry.
   * @returns Completion after the filtered catalog settles.
   */
  async function changeScriptFilter(value: string): Promise<void> {
    if (!isClassicFontScriptFilterId(value) || value === scriptFilter.value) return;
    scriptFilter.value = value;
    await searchFonts();
  }

  /** Opens configuration for the browsing source without discarding search. */
  function configureBrowsingSource(): void {
    if (selectedSourceId.value) sourceSettings.open(selectedSourceId.value);
    selectView("sources");
  }

  /**
   * Commits a search only when its source can serve requests.
   * @returns Completion of a local or remote search.
   */
  async function searchFonts(): Promise<void> {
    if (!needsConfiguration.value) await catalog.searchFonts();
  }

  /**
   * Clears search and language constraints together.
   * @returns Completion of the unfiltered query.
   */
  async function clearFilters(): Promise<void> {
    catalog.query.value = "";
    scriptFilter.value = "all";
    await searchFonts();
  }

  /** Reports whether one exact provider record is imported. */
  function isImported(family: ClassicEditorWebFontFamily): boolean {
    return importedKeys.value.has(createClassicFontHubFamilyKey(family));
  }

  /** Reports whether one family is already supplied by the application font pack. */
  function isMounted(family: ClassicEditorWebFontFamily): boolean {
    return mountedFamilyIdentities.value.has(normalizeFamily(family.family));
  }

  /** Reports whether one family needs neither a local import nor a new download. */
  function isAvailable(family: ClassicEditorWebFontFamily): boolean {
    return isMounted(family)
      || importedFamilyIdentities.value.has(normalizeFamily(family.family));
  }

  /**
   * Adds every unavailable curated family through the bounded single-family path.
   *
   * @returns Completion after the stable recommendation snapshot settles.
   */
  async function importRecommendedFonts(): Promise<void> {
    if (importingRecommended.value) return;
    const families = [...addableRecommendedFamilies.value];
    if (families.length === 0) return;
    importingRecommended.value = true;
    feedback.value = "";
    let completed = 0;
    try {
      for (const family of families) {
        if (await operations.importFont(family, false)) completed += 1;
      }
      if (completed === families.length) {
        feedbackTone.value = "success";
        feedback.value = message("recommendedFontsAdded");
      }
    } finally {
      importingRecommended.value = false;
    }
  }

  /** Reports whether one exact provider record has an active async operation. */
  function isPending(family: ClassicEditorWebFontFamily): boolean {
    return pendingFamilies.value.has(createClassicFontHubFamilyKey(family));
  }

  /**
   * Reports whether one exact provider family is currently loading for preview.
   *
   * @param family - Exact provider family.
   * @returns Whether preview registration is pending.
   */
  function isPreviewing(family: ClassicEditorWebFontFamily): boolean {
    return previewingFamilies.value.has(createClassicFontHubFamilyKey(family));
  }

  /**
   * Reports whether the browser can render one family's real registered face.
   *
   * @param family - Exact provider family.
   * @returns Whether the loader reached a usable phase.
   */
  function isPreviewReady(family: ClassicEditorWebFontFamily): boolean {
    if (isMounted(family)) return true;
    revision.value;
    const phase = library.value?.getStatus(family.family).phase;
    return phase === "installed" || phase === "registered" || phase === "local";
  }

  return {
    activeView,
    addableRecommendedFamilies,
    displayedResults: catalog.displayedResults,
    downloadOnImport,
    feedback,
    feedbackTone,
    hasSearched: catalog.hasSearched,
    importedFamilies,
    importingRecommended,
    changePage: catalog.changePage,
    page: catalog.page,
    pageCount: catalog.pageCount,
    pendingFamilies,
    previewingFamilies,
    query: catalog.query,
    searching: catalog.searching,
    scriptFilter,
    selectedSource,
    selectedSourceId,
    sourceSettings,
    isRecommended,
    catalogOptions,
    needsConfiguration,
    configureBrowsingSource,
    clearFilters,
    catalogError: catalog.error,
    submittedQuery: catalog.submittedQuery,
    totalIsExact: catalog.totalIsExact,
    sourceOptions,
    sources,
    totalResultCount: catalog.totalResultCount,
    changeScriptFilter,
    isImported,
    isAvailable,
    isMounted,
    isPending,
    isPreviewing,
    isPreviewReady,
    importFont: operations.importFont,
    importRecommendedFonts,
    previewFont: operations.previewFont,
    removeFont: operations.removeFont,
    searchFonts,
    selectView,
  };
}

/**
 * Normalizes one CSS family for mounted-resource comparison.
 *
 * @param family - Candidate family.
 * @returns Stable case-insensitive identity.
 */
function normalizeFamily(family: string): string {
  return family.trim().toLocaleLowerCase("en-US");
}
