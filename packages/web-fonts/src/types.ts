import type { QuireFontServiceSource } from "@quirekit/render-contract";

/** Font container formats understood by web-font manifests. */
export type QuireWebFontFormat = "woff2" | "woff" | "truetype" | "opentype";

/** Typed failure categories exposed by the web-font runtime. */
export type QuireWebFontErrorCode =
  | "authorization"
  | "cache"
  | "catalog"
  | "destroyed"
  | "font-parse"
  | "integrity"
  | "network"
  | "registration"
  | "size"
  | "unsupported";

/** Availability states returned by explicit family inspection. */
export type QuireWebFontAvailability =
  | "local"
  | "registered"
  | "cached"
  | "downloadable"
  | "unavailable";

/** Observable loader lifecycle states. */
export type QuireWebFontStatusPhase =
  | "idle"
  | "inspecting"
  | "local"
  | "registered"
  | "cached"
  | "downloadable"
  | "unavailable"
  | "authorizing"
  | "downloading"
  | "registering"
  | "installed"
  | "error";

/** Installation result authorities. */
export type QuireWebFontInstallationSource =
  | "local"
  | "registered"
  | "cache"
  | "download";

/** Provider-declared license information shown before download. */
export interface QuireWebFontLicenseNotice {
  /** Human-readable license or notice label. */
  readonly name: string;
  /** Authoritative page containing the applicable license information. */
  readonly url: string;
  /** Optional SPDX identifier when the provider declares one unambiguously. */
  readonly spdxId?: string | undefined;
}

/** One ordered URL candidate for a font asset. */
export interface QuireWebFontAssetSource {
  /** CORS-readable asset URL. */
  readonly url: string;
  /** Optional declared font container format. */
  readonly format?: QuireWebFontFormat | undefined;
}

/** One independently downloadable and cacheable font binary. */
export interface QuireWebFontAsset {
  /** Stable asset id within its face. */
  readonly id: string;
  /** Ordered mirrors expected to serve equivalent bytes. */
  readonly sources: readonly QuireWebFontAssetSource[];
  /** Optional CSS unicode-range covered by this asset shard. */
  readonly unicodeRange?: string | undefined;
  /** Optional expected SRI-shaped SHA-256 digest. */
  readonly integrity?: string | undefined;
  /** Optional provider-declared byte length checked before cache insertion. */
  readonly sizeBytes?: number | undefined;
  /** Optional cache lifetime used when the response omits max-age. */
  readonly cacheMaxAgeSeconds?: number | undefined;
  /** Optional font-collection face index used by compatible shaping backends. */
  readonly faceIndex?: number | undefined;
  /** Whether this asset is explicitly compatible with Layout shaping. */
  readonly shaping?: boolean | undefined;
}

/** CSS face descriptors and binary shards for one family face. */
export interface QuireWebFontFace {
  /** Stable face id within its family manifest. */
  readonly id: string;
  /** CSS font-style descriptor. */
  readonly style?: string | undefined;
  /** CSS font-weight descriptor or range. */
  readonly weight?: string | undefined;
  /** CSS font-stretch descriptor or range. */
  readonly stretch?: string | undefined;
  /** Assets that together cover this face. */
  readonly assets: readonly QuireWebFontAsset[];
}

/** Complete provider candidate for one logical family version. */
export interface QuireWebFontFamilyManifest {
  /** Stable provider identity used by policy and cache records. */
  readonly providerId: string;
  /** Optional stable family identity within the provider. */
  readonly familyId?: string | undefined;
  /** CSS family represented by every face. */
  readonly family: string;
  /** Provider family version used for cache invalidation. */
  readonly version: string;
  /** Provider-declared license notice passed to host authorization. */
  readonly license: QuireWebFontLicenseNotice;
  /** Optional CSS generic family used by Layout fallback matching. */
  readonly genericFamily?: string | undefined;
  /** Complete set of faces in this candidate. */
  readonly faces: readonly QuireWebFontFace[];
}

/** Ordered manifest resolver supplied by a host or built-in provider adapter. */
export interface QuireWebFontCatalog {
  /** Stable catalog identity used by diagnostics. */
  readonly id: string;
  /**
   * Resolves a complete candidate for one family.
   *
   * @param family - Logical family requested by the document or product.
   * @returns Matching manifest or null when the catalog does not provide it.
   */
  resolveFamily(
    family: string
  ): QuireWebFontFamilyManifest | null | Promise<QuireWebFontFamilyManifest | null>;
}

/** Persistent binary record stored outside canonical document state. */
export interface QuireWebFontCacheRecord {
  /** Versioned asset cache key. */
  readonly key: string;
  /** Normalized family used by family-wide deletion. */
  readonly normalizedFamily: string;
  /** Provider that supplied the manifest. */
  readonly providerId: string;
  /** Manifest family spelling. */
  readonly family: string;
  /** Manifest family version. */
  readonly version: string;
  /** Face id within the manifest. */
  readonly faceId: string;
  /** Asset id within the face. */
  readonly assetId: string;
  /** Mirror URL that supplied these bytes. */
  readonly sourceUrl: string;
  /** Isolated font binary. */
  readonly data: ArrayBuffer;
  /** Observed SRI-shaped SHA-256 digest. */
  readonly digest: string;
  /** Expected digest declared before download, when available. */
  readonly expectedIntegrity?: string | undefined;
  /** Absolute expiry in epoch milliseconds, when required. */
  readonly expiresAt?: number | undefined;
  /** Storage time in epoch milliseconds. */
  readonly storedAt: number;
}

/** Replaceable persistent cache used by the font loader. */
export interface QuireWebFontCache {
  /** Whether successful writes survive the current browsing session. */
  readonly persistent?: boolean | undefined;
  /**
   * Reads one record.
   *
   * @param key - Versioned asset cache key.
   * @returns Cached record or undefined.
   */
  get(key: string): Promise<QuireWebFontCacheRecord | undefined>;
  /**
   * Atomically writes one complete record.
   *
   * @param record - Verified binary record.
   */
  put(record: QuireWebFontCacheRecord): Promise<void>;
  /**
   * Deletes one asset record.
   *
   * @param key - Versioned asset cache key.
   */
  delete(key: string): Promise<void>;
  /**
   * Deletes every provider/version record for one logical family.
   *
   * @param normalizedFamily - Normalized family identity.
   */
  deleteFamily(normalizedFamily: string): Promise<void>;
  /** Releases optional database resources without deleting records. */
  destroy?(): void;
}

/** Downloaded or restored bytes paired with their manifest descriptors. */
export interface QuireInstalledWebFontAsset {
  /** Owning manifest face. */
  readonly face: QuireWebFontFace;
  /** Owning asset metadata. */
  readonly asset: QuireWebFontAsset;
  /** Isolated font binary. */
  readonly data: ArrayBuffer;
  /** Observed SRI-shaped SHA-256 digest. */
  readonly digest: string;
  /** URL that originally supplied the bytes. */
  readonly sourceUrl: string;
  /** Whether bytes came from persistent cache. */
  readonly fromCache: boolean;
  /** Whether bytes are durably stored for a later session. */
  readonly persistent: boolean;
}

/** Font family currently registered by one browser registry. */
export interface QuireRegisteredWebFontFamily {
  /** Complete provider manifest. */
  readonly manifest: QuireWebFontFamilyManifest;
  /** Bytes used for browser registration and optional shaping. */
  readonly assets: readonly QuireInstalledWebFontAsset[];
}

/** Replaceable browser registration boundary used by the loader and tests. */
export interface QuireWebFontRegistry {
  /**
   * Reports whether this registry owns a family.
   *
   * @param family - Family name in any supported casing or spacing.
   * @returns Whether the family is registered by this registry.
   */
  hasFamily(family: string): boolean;
  /**
   * Parses every face and registers the family atomically.
   *
   * @param manifest - Complete provider candidate.
   * @param assets - Verified bytes for every manifest asset.
   * @returns Registered family record.
   */
  register(
    manifest: QuireWebFontFamilyManifest,
    assets: readonly QuireInstalledWebFontAsset[]
  ): Promise<QuireRegisteredWebFontFamily>;
  /**
   * Unregisters one family owned by this registry.
   *
   * @param family - Family to unregister.
   */
  unregister(family: string): void;
  /** Unregisters every owned family and prevents later registration. */
  destroy(): void;
}

/** Explicit family inspection result. */
export interface QuireWebFontInspection {
  /** Manifest spelling or normalized requested family. */
  readonly family: string;
  /** Current availability without an implicit binary download. */
  readonly availability: QuireWebFontAvailability;
  /** First matching provider candidate when downloadable or cached. */
  readonly manifest?: QuireWebFontFamilyManifest | undefined;
}

/** Completed local, cached, or downloaded family installation. */
export interface QuireWebFontInstallation {
  /** Logical family satisfied by this result. */
  readonly family: string;
  /** Provider identity for cache or network installations. */
  readonly providerId?: string | undefined;
  /** Authority that satisfied the request. */
  readonly source: QuireWebFontInstallationSource;
  /** Whether every installed binary is persistent. */
  readonly persistent: boolean;
  /** Registered provider manifest when bytes were used. */
  readonly manifest?: QuireWebFontFamilyManifest | undefined;
  /** Verified installed assets when bytes were used. */
  readonly assets?: readonly QuireInstalledWebFontAsset[] | undefined;
}

/** Observable status snapshot for one normalized family. */
export interface QuireWebFontStatus {
  /** Requested or manifest family spelling. */
  readonly family: string;
  /** Current lifecycle phase. */
  readonly phase: QuireWebFontStatusPhase;
  /** Active provider identity, when known. */
  readonly providerId?: string | undefined;
  /** Current typed diagnostic, when the phase is error. */
  readonly error?: QuireWebFontError | undefined;
}

/** Context supplied before any provider binary is downloaded. */
export interface QuireWebFontAuthorizationContext {
  /** Complete atomic provider candidate. */
  readonly manifest: QuireWebFontFamilyManifest;
}

/** Fetch implementation used for provider metadata and font assets. */
export type QuireWebFontFetch = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

/** Options used to create the external web-font loader. */
export interface QuireWebFontLoaderOptions {
  /** Ordered host-enabled catalogs. */
  readonly catalogs: readonly QuireWebFontCatalog[];
  /** Optional persistent cache; defaults to IndexedDB or memory fallback. */
  readonly cache?: QuireWebFontCache | undefined;
  /** Optional browser registry; defaults to the resolved owner document. */
  readonly registry?: QuireWebFontRegistry | undefined;
  /** Optional owner document used by the default browser registry and local probe. */
  readonly ownerDocument?: Document | undefined;
  /** Required host policy invoked before downloading each provider candidate. */
  readonly authorizeDownload: (
    context: QuireWebFontAuthorizationContext
  ) => boolean | Promise<boolean>;
  /** Optional fetch implementation. */
  readonly fetch?: QuireWebFontFetch | undefined;
  /** Optional exact local-family probe. */
  readonly probeLocalFamily?: ((family: string) => Promise<boolean>) | undefined;
  /** Maximum bytes accepted for one asset. Defaults to 64 MiB. */
  readonly maxAssetBytes?: number | undefined;
  /** Maximum assets fetched concurrently for one manifest. Defaults to 8. */
  readonly maxConcurrentAssets?: number | undefined;
  /** Optional clock used by cache expiry and tests. */
  readonly now?: (() => number) | undefined;
  /** Callback invoked once after one family reaches authoritative readiness. */
  readonly onReady?: ((installation: QuireWebFontInstallation) => void) | undefined;
}

/** Public external web-font runtime. */
export interface QuireWebFontLoader {
  /**
   * Reads the last observable status for one family.
   *
   * @param family - Family name.
   * @returns Immutable current status.
   */
  getStatus(family: string): QuireWebFontStatus;
  /**
   * Subscribes to status changes.
   *
   * @param listener - Status observer.
   * @returns Unsubscribe callback.
   */
  subscribe(listener: (status: QuireWebFontStatus) => void): () => void;
  /**
   * Inspects a family without downloading font binaries.
   *
   * @param family - Logical family request.
   * @returns Explicit availability result.
   */
  inspectFamily(family: string): Promise<QuireWebFontInspection>;
  /**
   * Explicitly installs or restores one family.
   *
   * @param family - Logical family request.
   * @returns Completed installation.
   */
  installFamily(family: string): Promise<QuireWebFontInstallation>;
  /**
   * Restores one previously resolved manifest from local or cached resources only.
   *
   * @param manifest - Complete manifest persisted by the owning product.
   * @returns Restored installation, or null when no local/cache authority exists.
   */
  restoreFamily(
    manifest: QuireWebFontFamilyManifest
  ): Promise<QuireWebFontInstallation | null>;
  /**
   * Unregisters and deletes cached records for one family.
   *
   * @param family - Logical family to remove.
   */
  removeFamily(family: string): Promise<void>;
  /** Releases runtime resources without deleting persistent records. */
  destroy(): void;
}

/** Layout-compatible source alias returned by the optional adapter. */
export type QuireInstalledFontServiceSource = QuireFontServiceSource;

/** Runtime error carrying a stable product-facing failure code. */
export class QuireWebFontError extends Error {
  /** Stable failure category. */
  readonly code: QuireWebFontErrorCode;
  /** Provider active at the failure, when known. */
  readonly providerId?: string | undefined;
  /** Source URL active at the failure, when known. */
  readonly url?: string | undefined;

  /**
   * Creates a typed web-font error.
   *
   * @param code - Stable failure category.
   * @param message - Human-readable developer diagnostic.
   * @param details - Optional provider, URL, and original cause.
   */
  constructor(
    code: QuireWebFontErrorCode,
    message: string,
    details: {
      readonly providerId?: string | undefined;
      readonly url?: string | undefined;
      readonly cause?: unknown;
    } = {}
  ) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause });
    this.name = "QuireWebFontError";
    this.code = code;
    this.providerId = details.providerId;
    this.url = details.url;
  }
}
