import { computed, onScopeDispose, ref } from "vue";
import type { ClassicEditorWebFontFamily } from "@classic/types";
import type { UseClassicFontCatalogOptions } from "./types";

const FONT_PAGE_SIZE = 24;

/**
 * Creates bounded catalog browsing with legacy complete-search compatibility.
 *
 * @param options - Reactive library, source, recommendations, and filters.
 * @returns Query, paging, result, and lifecycle controls.
 */
export function useClassicFontCatalog(options: UseClassicFontCatalogOptions) {
  const query = ref("");
  const submittedQuery = ref("");
  const submittedSubsets = ref<readonly string[]>([]);
  const error = ref("");
  const totalIsExact = ref(true);
  const results = ref<readonly ClassicEditorWebFontFamily[]>([]);
  const hasSearched = ref(false);
  const searching = ref(false);
  const page = ref(1);
  const catalogTotal = ref(0);
  const providerPaged = ref(false);
  let pageCache = new Map<number, readonly ClassicEditorWebFontFamily[]>();
  let cursorByPage = new Map<number, string | undefined>([[1, undefined]]);
  let requestRevision = 0;

  const localResults = computed(() =>
    options.curatedResults.value.filter((family) => {
      const query = submittedQuery.value.toLocaleLowerCase();
      return (
        [family.family, family.displayName, family.category, family.sourceLabel].some((value) =>
          value?.toLocaleLowerCase().includes(query)
        ) &&
        (!submittedSubsets.value.length ||
          family.subsets?.some((subset) => submittedSubsets.value.includes(subset)))
      );
    })
  );
  const availableResults = computed(() =>
    options.selectedSource.value === undefined
      ? localResults.value
      : hasSearched.value
      ? results.value
      : options.curatedResults.value
  );
  const totalResultCount = computed(() =>
    hasSearched.value && options.selectedSource.value
      ? catalogTotal.value
      : availableResults.value.length
  );
  const pageCount = computed(() => Math.max(1, Math.ceil(totalResultCount.value / FONT_PAGE_SIZE)));
  const displayedResults = computed(() => {
    if (hasSearched.value && providerPaged.value) return results.value;
    const offset = (page.value - 1) * FONT_PAGE_SIZE;
    return availableResults.value.slice(offset, offset + FONT_PAGE_SIZE);
  });

  /**
   * Searches or browses from the first page with the current query.
   *
   * @returns Completion after the first page settles.
   */
  async function searchFonts(): Promise<void> {
    resetResults();
    submittedQuery.value = query.value.trim();
    submittedSubsets.value = [...options.selectedSubsets.value];
    hasSearched.value = true;
    await loadPage(1);
  }

  /**
   * Loads one local or provider-paged catalog page.
   *
   * @param targetPage - One-based page to resolve.
   * @returns Completion after all required opaque cursors have resolved.
   */
  async function loadPage(targetPage: number): Promise<void> {
    const source = options.selectedSource.value;
    const currentLibrary = options.library.value;
    if (source === undefined || currentLibrary === undefined || searching.value) return;
    const currentRequest = ++requestRevision;
    const requestedQuery = submittedQuery.value;
    const requestedSubsets = [...submittedSubsets.value];
    error.value = "";
    searching.value = true;
    try {
      if (currentLibrary.browse === undefined) {
        providerPaged.value = false;
        const matches =
          requestedSubsets.length === 0
            ? await currentLibrary.search(source.id, requestedQuery)
            : await currentLibrary.search(source.id, requestedQuery, requestedSubsets);
        if (currentRequest !== requestRevision) return;
        results.value = matches;
        catalogTotal.value = results.value.length;
        page.value = targetPage;
        return;
      }
      providerPaged.value = true;
      for (let currentPage = 1; currentPage <= targetPage; currentPage += 1) {
        if (pageCache.has(currentPage)) continue;
        if (!cursorByPage.has(currentPage)) break;
        const cursor = cursorByPage.get(currentPage);
        const response =
          requestedSubsets.length === 0
            ? await currentLibrary.browse(source.id, requestedQuery, FONT_PAGE_SIZE, cursor)
            : await currentLibrary.browse(
                source.id,
                requestedQuery,
                FONT_PAGE_SIZE,
                cursor,
                requestedSubsets
              );
        if (currentRequest !== requestRevision) return;
        pageCache.set(currentPage, response.items);
        if (response.nextCursor !== undefined) {
          cursorByPage.set(currentPage + 1, response.nextCursor);
        }
        catalogTotal.value = response.total ?? inferTotal(currentPage, response);
        totalIsExact.value = response.total !== undefined || response.nextCursor === undefined;
      }
      results.value = pageCache.get(targetPage) ?? [];
      page.value = targetPage;
    } catch (error) {
      if (currentRequest !== requestRevision) return;
      searchError(error);
    } finally {
      if (currentRequest === requestRevision) searching.value = false;
    }
  }

  /** Clears provider cursors and result rows for a new query or source. */
  function resetResults(): void {
    requestRevision += 1;
    searching.value = false;
    page.value = 1;
    results.value = [];
    catalogTotal.value = 0;
    providerPaged.value = false;
    submittedQuery.value = "";
    submittedSubsets.value = [];
    error.value = "";
    totalIsExact.value = true;
    pageCache = new Map();
    cursorByPage = new Map([[1, undefined]]);
  }

  /** Invalidates pending writes while retaining the last committed result. */
  function invalidate(): void {
    requestRevision += 1;
    if (searching.value) hasSearched.value = false;
    searching.value = false;
  }

  /**
   * Records only a current request failure, leaving prior rows available.
   * @param cause - Current request failure.
   */
  function searchError(cause: unknown): void {
    error.value = toErrorMessage(cause);
  }

  onScopeDispose(invalidate);

  /**
   * Changes the visible page, resolving preceding opaque cursors as needed.
   *
   * @param value - Next one-based page.
   * @returns Completion after provider-backed paging settles.
   */
  async function changePage(value: number): Promise<void> {
    if (!hasSearched.value || !providerPaged.value) {
      page.value = value;
      return;
    }
    await loadPage(value);
  }

  return {
    changePage,
    displayedResults,
    hasSearched,
    page,
    pageCount,
    query,
    submittedQuery,
    error,
    totalIsExact,
    invalidate,
    resetResults,
    searchFonts,
    searching,
    totalResultCount
  };
}

/**
 * Infers a lower-bound total when a provider omits an exact count.
 *
 * @param currentPage - One-based provider page.
 * @param response - Current page rows and optional next cursor.
 * @returns Exact terminal total or a lower bound that exposes the next page.
 */
function inferTotal(
  currentPage: number,
  response: {
    readonly items: readonly ClassicEditorWebFontFamily[];
    readonly nextCursor?: string | undefined;
  }
): number {
  return response.nextCursor === undefined
    ? (currentPage - 1) * FONT_PAGE_SIZE + response.items.length
    : currentPage * FONT_PAGE_SIZE + 1;
}

/**
 * Converts an unknown provider error into visible diagnostic text.
 *
 * @param error - Unknown thrown value.
 * @returns Visible diagnostic text.
 */
function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
