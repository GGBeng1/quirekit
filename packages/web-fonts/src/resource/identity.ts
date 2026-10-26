/** Input used to create a stable font-asset cache key. */
export interface QuireWebFontAssetCacheKeyInput {
  /** Provider identity. */
  readonly providerId: string;
  /** Manifest family. */
  readonly family: string;
  /** Manifest family version. */
  readonly version: string;
  /** Manifest face id. */
  readonly faceId: string;
  /** Face asset id. */
  readonly assetId: string;
  /** CSS font-style descriptor. */
  readonly style?: string | undefined;
  /** CSS font-weight descriptor. */
  readonly weight?: string | undefined;
  /** CSS font-stretch descriptor. */
  readonly stretch?: string | undefined;
  /** Canonical source URL used when no expected digest exists. */
  readonly sourceUrl: string;
  /** Expected SRI-shaped digest, when declared. */
  readonly expectedIntegrity?: string | undefined;
}

/**
 * Normalizes a CSS family for lookup without changing manifest spelling.
 *
 * @param family - Raw family name.
 * @returns Locale-stable lookup identity.
 */
export function normalizeQuireWebFontFamily(family: string): string {
  return family.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

/**
 * Creates a readable, versioned cache key for one manifest asset.
 *
 * @param input - Provider, family, face, asset, and integrity identity.
 * @returns Stable cache key.
 */
export function createQuireWebFontAssetCacheKey(
  input: QuireWebFontAssetCacheKeyInput
): string {
  const parts = [
    "qkwf1",
    input.providerId,
    normalizeQuireWebFontFamily(input.family),
    input.version,
    input.faceId,
    input.assetId,
    input.style ?? "normal",
    input.weight ?? "normal",
    input.stretch ?? "normal",
    input.expectedIntegrity ?? input.sourceUrl
  ];
  return parts.map(encodeURIComponent).join(":");
}
