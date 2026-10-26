import type {
  QuireInstalledWebFontAsset,
  QuireWebFontAsset,
  QuireWebFontCache,
  QuireWebFontCacheRecord,
  QuireWebFontFace,
  QuireWebFontFamilyManifest
} from "../types";
import { createQuireWebFontAssetCacheKey, normalizeQuireWebFontFamily } from "./identity";
import { computeQuireWebFontSha256, verifyQuireWebFontIntegrity } from "./integrity";

/**
 * Restores a complete family candidate only when every asset is valid.
 *
 * @param cache - Persistent or session cache.
 * @param manifest - Candidate whose versioned assets are required.
 * @param now - Current epoch milliseconds.
 * @returns Complete installed asset list or null on any cache miss.
 */
export async function readQuireCachedWebFontAssets(
  cache: QuireWebFontCache,
  manifest: QuireWebFontFamilyManifest,
  now: number
): Promise<readonly QuireInstalledWebFontAsset[] | null> {
  const installed: QuireInstalledWebFontAsset[] = [];
  for (const face of manifest.faces) {
    for (const asset of face.assets) {
      const key = createAssetKey(manifest, face, asset);
      let record: QuireWebFontCacheRecord | undefined;
      try {
        record = await cache.get(key);
      } catch {
        return null;
      }
      if (record === undefined) return null;
      if (record.expiresAt !== undefined && record.expiresAt <= now) {
        await ignoreCacheFailure(cache.delete(key));
        return null;
      }
      try {
        const digest = asset.integrity === undefined
          ? await computeQuireWebFontSha256(record.data)
          : await verifyQuireWebFontIntegrity(record.data, asset.integrity);
        if (digest !== record.digest) throw new Error("Cached digest metadata mismatch");
      } catch {
        await ignoreCacheFailure(cache.delete(key));
        return null;
      }
      installed.push({
        face,
        asset,
        data: record.data,
        digest: record.digest,
        sourceUrl: record.sourceUrl,
        fromCache: true,
        persistent: cache.persistent !== false
      });
    }
  }
  return installed;
}

/**
 * Writes one verified asset when provider or response metadata permits reuse.
 *
 * @param cache - Cache boundary.
 * @param manifest - Owning family manifest.
 * @param face - Owning face.
 * @param asset - Owning asset metadata.
 * @param data - Verified binary.
 * @param digest - Observed SHA-256 digest.
 * @param sourceUrl - Mirror that supplied the binary.
 * @param storedAt - Current epoch milliseconds.
 * @param expiresAt - Optional response or manifest expiry.
 * @returns Whether bytes were durably persisted.
 */
export async function cacheQuireWebFontAsset(
  cache: QuireWebFontCache,
  manifest: QuireWebFontFamilyManifest,
  face: QuireWebFontFace,
  asset: QuireWebFontAsset,
  data: ArrayBuffer,
  digest: string,
  sourceUrl: string,
  storedAt: number,
  expiresAt: number | undefined
): Promise<boolean> {
  if (asset.integrity === undefined && expiresAt === undefined) return false;
  const record: QuireWebFontCacheRecord = {
    key: createAssetKey(manifest, face, asset),
    normalizedFamily: normalizeQuireWebFontFamily(manifest.family),
    providerId: manifest.providerId,
    family: manifest.family,
    version: manifest.version,
    faceId: face.id,
    assetId: asset.id,
    sourceUrl,
    data,
    digest,
    ...(asset.integrity === undefined ? {} : { expectedIntegrity: asset.integrity }),
    ...(expiresAt === undefined ? {} : { expiresAt }),
    storedAt
  };
  try {
    await cache.put(record);
    return cache.persistent !== false;
  } catch {
    return false;
  }
}

/**
 * Creates the versioned key for one manifest asset.
 *
 * @param manifest - Owning family manifest.
 * @param face - Owning face.
 * @param asset - Cacheable asset.
 * @returns Stable asset key.
 */
export function createAssetKey(
  manifest: QuireWebFontFamilyManifest,
  face: QuireWebFontFace,
  asset: QuireWebFontAsset
): string {
  return createQuireWebFontAssetCacheKey({
    providerId: manifest.providerId,
    family: manifest.family,
    version: manifest.version,
    faceId: face.id,
    assetId: asset.id,
    style: face.style,
    weight: face.weight,
    stretch: face.stretch,
    sourceUrl: asset.sources[0]?.url ?? "",
    expectedIntegrity: asset.integrity
  });
}

/**
 * Awaits a best-effort cache mutation.
 *
 * @param operation - Cache operation.
 */
async function ignoreCacheFailure(operation: Promise<void>): Promise<void> {
  try {
    await operation;
  } catch {
    // Cache loss must not prevent a provider fallback or fresh download.
  }
}
