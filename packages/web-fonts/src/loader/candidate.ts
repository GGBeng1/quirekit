import type {
  QuireInstalledWebFontAsset,
  QuireWebFontCache,
  QuireWebFontCatalog,
  QuireWebFontFamilyManifest
} from "../types";
import { QuireWebFontError } from "../types";
import { readQuireCachedWebFontAssets } from "../resource/cache";

/** Candidate paired with a complete cache restoration. */
export interface QuireCachedWebFontCandidate {
  /** Atomic provider manifest. */
  readonly manifest: QuireWebFontFamilyManifest;
  /** Verified bytes for every manifest asset. */
  readonly assets: readonly QuireInstalledWebFontAsset[];
}

/**
 * Resolves all provider candidates in stable host order.
 *
 * @param catalogs - Enabled catalogs.
 * @param family - Requested family.
 * @returns Complete candidates from catalogs that provide the family.
 */
export async function resolveQuireWebFontCandidates(
  catalogs: readonly QuireWebFontCatalog[],
  family: string
): Promise<readonly QuireWebFontFamilyManifest[]> {
  const candidates: QuireWebFontFamilyManifest[] = [];
  let lastError: unknown;
  for (const catalog of catalogs) {
    try {
      const manifest = await catalog.resolveFamily(family);
      if (manifest !== null) candidates.push(manifest);
    } catch (error) {
      lastError = error;
    }
  }
  if (candidates.length === 0 && lastError !== undefined) {
    throw lastError instanceof QuireWebFontError
      ? lastError
      : new QuireWebFontError("catalog", `Failed to resolve web font family "${family}"`, {
        cause: lastError
      });
  }
  return candidates;
}

/**
 * Restores every complete cached candidate in provider order.
 *
 * @param cache - Cache boundary.
 * @param manifests - Ordered provider candidates.
 * @param now - Current epoch milliseconds.
 * @returns Candidates whose complete verified bytes are cached.
 */
export async function resolveQuireCachedWebFontCandidates(
  cache: QuireWebFontCache,
  manifests: readonly QuireWebFontFamilyManifest[],
  now: number
): Promise<readonly QuireCachedWebFontCandidate[]> {
  const candidates: QuireCachedWebFontCandidate[] = [];
  for (const manifest of manifests) {
    const assets = await readQuireCachedWebFontAssets(cache, manifest, now);
    if (assets !== null) candidates.push({ manifest, assets });
  }
  return candidates;
}
