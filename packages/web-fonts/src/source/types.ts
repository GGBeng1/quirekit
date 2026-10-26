import type {
  QuireWebFontFamilyManifest,
  QuireWebFontLicenseNotice
} from "../types";

/** Current declarative remote font-source protocol identifier. */
export const QUIRE_FONT_SOURCE_PROTOCOL_V1 = "quirekit-font-source/v1" as const;

/** Capability identifiers declared by one remote font source. */
export type QuireFontSourceCapability =
  | "browse"
  | "search"
  | "cursor-pagination"
  | "resolve";

/** JSON-safe localizable text contributed by a remote source. */
export interface QuireFontSourceText {
  /** Provider-authored fallback text. */
  readonly default: string;
  /** Optional BCP-47-tagged translations. */
  readonly translations?: Readonly<Record<string, string>> | undefined;
}

/** No-credential remote-source authentication. */
export interface QuireFontSourceNoAuthentication {
  /** Authentication discriminator. */
  readonly type: "none";
}

/** One locally supplied secret sent through a provider-declared header. */
export interface QuireFontSourceHeaderAuthentication {
  /** Authentication discriminator. */
  readonly type: "header";
  /** Local setting key that never comes from the remote descriptor value. */
  readonly settingKey: string;
  /** HTTP request header receiving the locally supplied value. */
  readonly headerName: string;
  /** Optional safe prefix such as `Bearer `. */
  readonly prefix?: string | undefined;
  /** User-facing setting label. */
  readonly label: QuireFontSourceText;
}

/** Supported declarative source-authentication descriptions. */
export type QuireFontSourceAuthentication =
  | QuireFontSourceNoAuthentication
  | QuireFontSourceHeaderAuthentication;

/** Validated V1 remote font-source descriptor. */
export interface QuireFontSourceDescriptor {
  /** Exact protocol version. */
  readonly specVersion: typeof QUIRE_FONT_SOURCE_PROTOCOL_V1;
  /** Stable reverse-DNS-style provider identity. */
  readonly id: string;
  /** Localizable source name. */
  readonly name: QuireFontSourceText;
  /** Optional human-facing provider homepage. */
  readonly homepageUrl?: string | undefined;
  /** CORS-readable catalog page endpoint. */
  readonly catalogUrl: string;
  /** CORS-readable family-manifest endpoint. */
  readonly resolveUrl: string;
  /** Declared source capabilities. */
  readonly capabilities: readonly QuireFontSourceCapability[];
  /** Source authentication populated only from local settings. */
  readonly authentication: QuireFontSourceAuthentication;
}

/** One searchable remote catalog family. */
export interface QuireFontSourceFamilySummary {
  /** Stable identity inside the source. */
  readonly familyId: string;
  /** Exact CSS family used after registration. */
  readonly family: string;
  /** Optional localized or provider-facing display name. */
  readonly displayName?: string | undefined;
  /** Exact provider version used for later manifest resolution. */
  readonly version: string;
  /** Required family-level license disclosure. */
  readonly license: QuireWebFontLicenseNotice;
  /** Optional source-neutral category. */
  readonly category?: string | undefined;
  /** Optional script/subset identifiers. */
  readonly subsets?: readonly string[] | undefined;
  /** Optional CSS weight descriptors. */
  readonly weights?: readonly string[] | undefined;
  /** Optional CSS style descriptors. */
  readonly styles?: readonly string[] | undefined;
}

/** One bounded remote catalog page. */
export interface QuireFontSourceCatalogPage {
  /** Families in provider order. */
  readonly items: readonly QuireFontSourceFamilySummary[];
  /** Optional total result count. */
  readonly total?: number | undefined;
  /** Optional opaque cursor for the next page. */
  readonly nextCursor?: string | undefined;
}

/** Inputs for one remote catalog request. */
export interface QuireFontSourceBrowseRequest {
  /** Empty means browse all. */
  readonly query: string;
  /** Optional accepted subset tokens applied by the source before pagination. */
  readonly subsets?: readonly string[] | undefined;
  /** Maximum requested page size. */
  readonly limit: number;
  /** Optional provider cursor returned by the preceding page. */
  readonly cursor?: string | undefined;
  /** Origin-local source settings. */
  readonly settings?: Readonly<Record<string, string>> | undefined;
}

/** Inputs for resolving one exact remote family version. */
export interface QuireFontSourceResolveRequest {
  /** Stable family id from a catalog item. */
  readonly familyId: string;
  /** Exact version from the same catalog item. */
  readonly version: string;
  /** Origin-local source settings. */
  readonly settings?: Readonly<Record<string, string>> | undefined;
}

/** Fetch and validation limits for declarative remote sources. */
export interface QuireRemoteFontSourceLimits {
  /** Maximum descriptor response bytes. */
  readonly maxDescriptorBytes?: number | undefined;
  /** Maximum catalog response bytes. */
  readonly maxCatalogBytes?: number | undefined;
  /** Maximum manifest response bytes. */
  readonly maxManifestBytes?: number | undefined;
  /** Maximum accepted items in one catalog page. */
  readonly maxPageItems?: number | undefined;
}

/** Validated client for one declarative remote font-source protocol. */
export interface QuireRemoteFontSourceClient {
  /**
   * Loads and validates one source descriptor.
   *
   * @param descriptorUrl - Explicit user- or host-supplied descriptor URL.
   * @returns Validated absolute source descriptor.
   */
  loadDescriptor(descriptorUrl: string): Promise<QuireFontSourceDescriptor>;
  /**
   * Browses one validated source without fetching font binaries.
   *
   * @param descriptor - Validated source descriptor.
   * @param request - Query, page size, cursor, and local settings.
   * @returns Validated bounded catalog page.
   */
  browse(
    descriptor: QuireFontSourceDescriptor,
    request: QuireFontSourceBrowseRequest
  ): Promise<QuireFontSourceCatalogPage>;
  /**
   * Resolves one exact family version into an installable manifest.
   *
   * @param descriptor - Validated source descriptor.
   * @param request - Stable family identity, version, and local settings.
   * @returns Validated immutable provider manifest.
   */
  resolveFamily(
    descriptor: QuireFontSourceDescriptor,
    request: QuireFontSourceResolveRequest
  ): Promise<QuireWebFontFamilyManifest>;
}
