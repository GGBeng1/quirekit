import type { QuireFontSubstitutionCandidateSource } from "@quirekit/core";
import type {
  QuireWebFontCache,
  QuireWebFontCatalog,
  QuireWebFontFetch,
  QuireWebFontFamilyManifest,
  QuireWebFontInstallation,
  QuireFontSourceDescriptor,
  QuireWebFontLicenseNotice,
  QuireWebFontStatus
} from "@quirekit/web-fonts";
import type {
  ClassicEditorBilingualText,
  ClassicEditorLocale
} from "./base";

/** Availability state for the logical document body font in one mounted host. */
export type ClassicEditorDocumentFontStatusKind =
  | "pending"
  | "available"
  | "substituted"
  | "unresolved";

/** Product-facing logical and rendered font facts for the current document. */
export interface ClassicEditorDocumentFontStatus {
  /** Logical family retained in the canonical document and font control. */
  readonly requestedFamily: string | null;
  /** Exact family selected before generic glyph fallback, when resolved. */
  readonly renderedFamily: string | null;
  /** Current asynchronous availability result. */
  readonly status: ClassicEditorDocumentFontStatusKind;
  /** Candidate authority that supplied the rendered family. */
  readonly source: QuireFontSubstitutionCandidateSource | null;
}

/** One host-disclosed family available from Classic's explicit font library. */
export interface ClassicEditorWebFontFamily {
  /** Stable provider-local identity, falling back to the normalized family for legacy records. */
  readonly familyId?: string | undefined;
  /** Exact logical family name accepted by the configured catalogs. */
  readonly family: string;
  /** Exact provider version used for immutable resolution when available. */
  readonly version?: string | undefined;
  /** Optional localized/provider display name shown without changing CSS identity. */
  readonly displayName?: string | undefined;
  /** Source adapter that can resolve this family after import. */
  readonly sourceId: string;
  /** Human-readable provider label shown before download. */
  readonly sourceLabel: string;
  /** License-information notice shown before download. */
  readonly license: QuireWebFontLicenseNotice;
  /** Optional provider category used by the Hub. */
  readonly category?: string | undefined;
  /** Optional supported script/subset labels. */
  readonly subsets?: readonly string[] | undefined;
  /** Optional provider variant labels. */
  readonly variants?: readonly string[] | undefined;
}

/** One source-specific setting rendered by the font Hub. */
export interface ClassicEditorWebFontSourceSettingField {
  /** Stable setting key persisted only in product-local state. */
  readonly key: string;
  /** Localized visible field label. */
  readonly label: ClassicEditorBilingualText;
  /** Optional localized placeholder. */
  readonly placeholder?: ClassicEditorBilingualText | undefined;
  /** Whether the field must be non-empty before search. */
  readonly required?: boolean | undefined;
  /** Whether the UI should mask the value. */
  readonly secret?: boolean | undefined;
}

/** Source-local string settings such as a host-owned API key. */
export type ClassicEditorWebFontSourceSettings = Readonly<Record<string, string>>;

/** Built-in copy slots consumed by the public controlled font Hub. */
export type ClassicEditorFontHubMessageKey =
  | "addRecommendedFonts"
  | "available"
  | "fontHubNotice"
  | "fontSourceNotice"
  | "fontPreviewText"
  | "fontPreviewSize"
  | "fontPreviewHint"
  | "collapseFontPreview"
  | "fontAddFailed"
  | "fontCacheRecorded"
  | "fontRemoveNotice"
  | "confirmRemoveFont"
  | "cancel"
  | "clearFontFilters"
  | "retryFontSearch"
  | "searchSourceFirst"
  | "configureFontSource"
  | "fontSettingRequired"
  | "advancedFontSources"
  | "fontDescriptorHelp"
  | "addFontSource"
  | "allLanguages"
  | "allFonts"
  | "close"
  | "customFontSources"
  | "descriptorUrl"
  | "enableFontSource"
  | "fontCatalog"
  | "fontDownloadFailed"
  | "fontHub"
  | "filterByLanguage"
  | "fontInstalled"
  | "fontSearchFailed"
  | "fontSources"
  | "importAndDownload"
  | "imported"
  | "importedFonts"
  | "importFont"
  | "importingFont"
  | "licenseInformation"
  | "noFontResults"
  | "noFontSources"
  | "noCustomFontSources"
  | "noImportedFonts"
  | "noSourceSettings"
  | "previewFont"
  | "previewFontFailed"
  | "previewReady"
  | "recommendedFonts"
  | "recommendedFontsAdded"
  | "removeFont"
  | "removeFontSource"
  | "saveSourceSettings"
  | "searchFontPlaceholder"
  | "searchFonts"
  | "searchResults"
  | "searchingFonts"
  | "selectFontSource"
  | "sourceLocalNotice"
  | "sourceSettings"
  | "sourceSettingsSaved"
  | "sourceEnabled"
  | "sourceRemoved"
  | "sourceTestFailed"
  | "sourceValidated"
  | "testFontSource"
  | "testingFontSource";

/** Optional host copy overrides for the public controlled font Hub. */
export type ClassicEditorFontHubMessages = Readonly<
  Partial<Record<ClassicEditorFontHubMessageKey, string>>
>;

/** Public controlled inputs accepted by the reusable Vue font Hub. */
export interface ClassicEditorFontHubProps {
  /** Whether the dialog is currently visible. */
  readonly open: boolean;
  /** Optional mounted Classic root owning the portal document and overlay scope. */
  readonly themeRoot?: HTMLElement | undefined;
  /** Optional mounted headless font-library authority. */
  readonly library?: ClassicEditorFontLibrary | undefined;
  /** Active product locale. */
  readonly locale: ClassicEditorLocale;
  /** Optional visible-copy overrides supplied by the host. */
  readonly messages?: ClassicEditorFontHubMessages | undefined;
  /** Optional Classic CSS variables projected onto the shared workspace. */
  readonly themeVariables?: Readonly<Record<string, string>> | undefined;
}

/** Search request passed to a configured external font source. */
export interface ClassicEditorWebFontSearchRequest {
  /** User-entered family query. */
  readonly query: string;
  /** Optional accepted provider subset tokens for language/script filtering. */
  readonly subsets?: readonly string[] | undefined;
  /** Current origin-local settings for this source. */
  readonly settings: ClassicEditorWebFontSourceSettings;
}

/** Bounded catalog request passed to a paged external font source. */
export interface ClassicEditorWebFontBrowseRequest extends ClassicEditorWebFontSearchRequest {
  /** Maximum requested result count. */
  readonly limit: number;
  /** Optional opaque cursor returned by the preceding page. */
  readonly cursor?: string | undefined;
}

/** One bounded provider catalog page. */
export interface ClassicEditorWebFontCatalogPage {
  /** Families in provider order. */
  readonly items: readonly ClassicEditorWebFontFamily[];
  /** Optional total result count. */
  readonly total?: number | undefined;
  /** Optional opaque cursor for the next page. */
  readonly nextCursor?: string | undefined;
}

/** Manifest-resolution request for one explicitly imported family. */
export interface ClassicEditorWebFontResolutionRequest {
  /** Imported or curated family metadata. */
  readonly family: ClassicEditorWebFontFamily;
  /** Current origin-local settings for this source. */
  readonly settings: ClassicEditorWebFontSourceSettings;
}

/** Replaceable searchable font source configured by a Classic host. */
export interface ClassicEditorWebFontSource {
  /** Stable source identity. */
  readonly id: string;
  /** Localized product-facing source label. */
  readonly label: ClassicEditorBilingualText;
  /** Short source-specific catalog or connection guidance. */
  readonly description?: ClassicEditorBilingualText | undefined;
  /** Source-specific settings rendered by the Hub. */
  readonly settingFields: readonly ClassicEditorWebFontSourceSettingField[];
  /** Whether the source is bundled by the host or enabled from a remote descriptor. */
  readonly kind?: "built-in" | "custom" | undefined;
  /** Original declarative descriptor URL for a custom source. */
  readonly descriptorUrl?: string | undefined;
  /** Optional provider homepage disclosed by the source. */
  readonly homepageUrl?: string | undefined;
  /**
   * Searches provider metadata without downloading font binaries.
   *
   * @param request - Query and local source settings.
   * @returns Matching provider family metadata.
   */
  search(
    request: ClassicEditorWebFontSearchRequest
  ): Promise<readonly ClassicEditorWebFontFamily[]>;
  /**
   * Browses one bounded provider page without downloading font binaries.
   *
   * @param request - Query, page size, cursor, and local settings.
   * @returns One provider catalog page.
   */
  browse?(
    request: ClassicEditorWebFontBrowseRequest
  ): Promise<ClassicEditorWebFontCatalogPage>;
  /**
   * Resolves one imported family into an installable atomic manifest.
   *
   * @param request - Imported family and source settings.
   * @returns Complete provider manifest.
   */
  resolveFamily(
    request: ClassicEditorWebFontResolutionRequest
  ): Promise<QuireWebFontFamilyManifest>;
}

/** Persisted declarative source enabled by the current browser user. */
export interface ClassicEditorCustomWebFontSourceRecord {
  /** User-supplied HTTPS descriptor location. */
  readonly descriptorUrl: string;
  /** Fully validated V1 descriptor used to recreate the source adapter. */
  readonly descriptor: QuireFontSourceDescriptor;
  /** Epoch milliseconds when the source was enabled. */
  readonly enabledAt: number;
}

/** Snapshot of a user-connected static CSS font directory. */
export interface ClassicEditorStylesheetFontSourceRecord {
  /** Direct HTTP(S) stylesheet location and base for relative assets. */
  readonly url: string;
  /** User-visible source name. */
  readonly name: string;
  /** Bounded font-face stylesheet; never inserted into the page. */
  readonly css: string;
  /** Snapshot revision retained across browser remounts. */
  readonly enabledAt: number;
}

/** Locally imported family known to the current Classic product. */
export interface ClassicEditorImportedWebFontFamily extends ClassicEditorWebFontFamily {
  /** Epoch milliseconds when the family was imported. */
  readonly importedAt: number;
  /** Complete persisted manifest used for cache-only remount restoration. */
  readonly manifest?: QuireWebFontFamilyManifest | undefined;
}

/** Font family whose CSS faces are already mounted by the application. */
export interface ClassicEditorMountedFontFamily {
  /** Exact CSS family registered by the application stylesheet. */
  readonly family: string;
  /** Optional product-facing label that does not change CSS identity. */
  readonly displayName?: string | undefined;
}

/** JSON-safe local product state owned by the font Hub. */
export interface ClassicEditorFontLibraryPersistedState {
  /** Settings keyed by font source id. */
  readonly sourceSettings: Readonly<
    Record<string, ClassicEditorWebFontSourceSettings>
  >;
  /** Families explicitly imported into this browser product. */
  readonly importedFamilies: readonly ClassicEditorImportedWebFontFamily[];
  /** Most recently selected visible families, newest first. */
  readonly recentFamilies?: readonly string[] | undefined;
  /** Declarative remote sources explicitly enabled in this browser. */
  readonly customSources?: readonly ClassicEditorCustomWebFontSourceRecord[] | undefined;
  /** Static CSS directories explicitly connected by the user. */
  readonly stylesheetSources?: readonly ClassicEditorStylesheetFontSourceRecord[] | undefined;
}

/** Replaceable origin-local persistence boundary for the font Hub. */
export interface ClassicEditorFontLibraryPersistence {
  /** @returns Last valid local state or an empty state. */
  load(): ClassicEditorFontLibraryPersistedState;
  /**
   * Persists one complete state snapshot.
   *
   * @param state - JSON-safe source settings and imported families.
   */
  save(state: ClassicEditorFontLibraryPersistedState): void;
}

/** Host policy and provider boundaries for Classic's external font library. */
export interface ClassicEditorWebFontOptions {
  /** Families disclosed to users as explicitly downloadable. */
  readonly families: readonly ClassicEditorWebFontFamily[];
  /** Families already registered by application-owned stylesheets. */
  readonly mountedFamilies?: readonly ClassicEditorMountedFontFamily[] | undefined;
  /** Searchable provider adapters displayed by the font Hub. */
  readonly sources?: readonly ClassicEditorWebFontSource[] | undefined;
  /** Optional local Hub persistence override. */
  readonly persistence?: ClassicEditorFontLibraryPersistence | undefined;
  /** Ordered provider catalogs enabled by the host. */
  readonly catalogs: readonly QuireWebFontCatalog[];
  /** Optional persistent cache override. */
  readonly cache?: QuireWebFontCache | undefined;
  /** Optional font-asset fetch implementation. */
  readonly fetch?: QuireWebFontFetch | undefined;
  /** Maximum accepted bytes for one provider asset. */
  readonly maxAssetBytes?: number | undefined;
  /** Maximum provider assets fetched concurrently. */
  readonly maxConcurrentAssets?: number | undefined;
}

/** Mounted Classic authority for explicit external font installation. */
export interface ClassicEditorFontLibrary {
  /** Host-disclosed families available from the current mount. */
  readonly families: readonly ClassicEditorWebFontFamily[];
  /** Searchable configured sources. */
  readonly sources: readonly ClassicEditorWebFontSource[];
  /** Families explicitly imported into this browser product. */
  readonly importedFamilies: readonly ClassicEditorImportedWebFontFamily[];
  /** Families already registered by application-owned stylesheets. */
  readonly mountedFamilies: readonly ClassicEditorMountedFontFamily[];
  /** Most recently selected visible families, newest first. */
  readonly recentFamilies: readonly string[];
  /**
   * Remembers one explicit font choice in origin-local product state.
   *
   * @param family - Exact logical family selected by the user.
   */
  rememberRecentFamily(family: string): void;
  /**
   * Reads completed byte-backed, local, or registered installation results.
   *
   * Consumers must treat the returned records as read-only runtime resources.
   * Local-only records intentionally contain no embeddable font bytes.
   *
   * @returns Immutable installation snapshot in readiness order.
   */
  getInstallations(): readonly QuireWebFontInstallation[];
  /**
   * Observes source, import, and loader lifecycle changes.
   *
   * @param listener - Product-chrome invalidation callback.
   * @returns Unsubscribe callback.
   */
  subscribe(listener: () => void): () => void;
  /**
   * Reads current local settings for one source.
   *
   * @param sourceId - Stable source identity.
   * @returns Source-local setting values.
   */
  getSourceSettings(sourceId: string): ClassicEditorWebFontSourceSettings;
  /**
   * Saves complete local settings for one source.
   *
   * @param sourceId - Stable source identity.
   * @param settings - Source-local values.
   */
  configureSource(sourceId: string, settings: ClassicEditorWebFontSourceSettings): void;
  /**
   * Searches one configured source.
   *
   * @param sourceId - Stable source identity.
   * @param query - User-entered family query.
   * @param subsets - Optional accepted provider subset tokens.
   * @returns Matching provider families.
   */
  search(
    sourceId: string,
    query: string,
    subsets?: readonly string[]
  ): Promise<readonly ClassicEditorWebFontFamily[]>;
  /**
   * Browses one bounded page from a configured source.
   *
   * @param sourceId - Stable source identity.
   * @param query - User-entered family query or an empty browse-all query.
   * @param limit - Maximum requested result count.
   * @param cursor - Optional cursor returned by the preceding page.
   * @param subsets - Optional accepted provider subset tokens applied before paging.
   * @returns One provider catalog page.
   */
  browse?(
    sourceId: string,
    query: string,
    limit: number,
    cursor?: string,
    subsets?: readonly string[]
  ): Promise<ClassicEditorWebFontCatalogPage>;
  /**
   * Validates one declarative source without enabling it.
   *
   * @param descriptorUrl - User-supplied HTTPS descriptor URL.
   * @returns Persistable validated source record.
   */
  inspectCustomSource?(
    descriptorUrl: string
  ): Promise<ClassicEditorCustomWebFontSourceRecord>;
  /**
   * Enables one previously inspected declarative source.
   *
   * @param record - Validated persistable source record.
   */
  enableCustomSource?(record: ClassicEditorCustomWebFontSourceRecord): void;
  /**
   * Reads a static font-face stylesheet without downloading fonts or enabling it.
   * @param url - Direct HTTP(S) CSS URL, including localhost services.
   * @param name - Optional user-visible source name.
   * @returns Validated persistable CSS snapshot.
   */
  inspectStylesheetSource?(url: string, name?: string): Promise<ClassicEditorStylesheetFontSourceRecord>;
  /**
   * Enables or updates a previously inspected static directory.
   * @param record - Validated CSS snapshot.
   */
  enableStylesheetSource?(record: ClassicEditorStylesheetFontSourceRecord): void;
  /**
   * Removes one declarative source while retaining already imported families.
   *
   * @param sourceId - Stable custom source identity.
   */
  removeCustomSource?(sourceId: string): void;
  /**
   * Downloads and registers one disclosed family for an explicit visual preview.
   *
   * Previewing may populate the external-font byte cache but does not add an
   * imported-family record to product persistence.
   *
   * @param family - Exact provider search or curated family result.
   * @returns Completion after the browser can render the real family.
   */
  previewFamily(family: ClassicEditorWebFontFamily): Promise<void>;
  /**
   * Imports one provider family and optionally installs its bytes now.
   *
   * @param family - Provider search or curated family result.
   * @param download - Whether to download/register immediately.
   */
  importFamily(family: ClassicEditorWebFontFamily, download?: boolean): Promise<void>;
  /**
   * Removes one imported family and its cached bytes.
   *
   * @param family - Exact imported record or legacy family name.
   */
  removeFamily(family: ClassicEditorWebFontFamily | string): Promise<void>;
  /**
   * Reads the external loader lifecycle for one family.
   *
   * @param family - Exact configured family name.
   * @returns Current immutable loader status.
   */
  getStatus(family: string): QuireWebFontStatus;
  /**
   * Installs one disclosed family after an explicit user or host action.
   *
   * @param family - Exact configured family name.
   * @returns Completion after browser registration and layout invalidation.
   */
  install(family: string): Promise<void>;
}
