import type {
  QuireInstalledWebFontAsset,
  QuireWebFontAsset,
  QuireWebFontCache,
  QuireWebFontFamilyManifest,
  QuireWebFontFetch
} from "../types";
import { QuireWebFontError } from "../types";
import { cacheQuireWebFontAsset } from "./cache";
import { computeQuireWebFontSha256, verifyQuireWebFontIntegrity } from "./integrity";

/** Runtime dependencies for downloading one complete manifest. */
export interface QuireWebFontDownloadOptions {
  /** Fetch implementation. */
  readonly fetch: QuireWebFontFetch;
  /** Cache that receives reusable verified assets. */
  readonly cache: QuireWebFontCache;
  /** Maximum accepted bytes for one asset. */
  readonly maxAssetBytes: number;
  /** Maximum assets fetched concurrently for one manifest. */
  readonly maxConcurrentAssets: number;
  /** Current epoch-millisecond clock. */
  readonly now: () => number;
}

interface DownloadedResponse {
  /** Complete response bytes. */
  readonly data: ArrayBuffer;
  /** Observed SHA-256 digest. */
  readonly digest: string;
  /** Mirror URL that succeeded. */
  readonly sourceUrl: string;
  /** Optional cache expiry derived from response or manifest. */
  readonly expiresAt?: number | undefined;
}

/**
 * Downloads and verifies every asset required by one provider candidate.
 *
 * @param manifest - Complete provider candidate.
 * @param options - Fetch, cache, size, and clock boundaries.
 * @returns Installed bytes in manifest order.
 */
export async function downloadQuireWebFontManifest(
  manifest: QuireWebFontFamilyManifest,
  options: QuireWebFontDownloadOptions
): Promise<readonly QuireInstalledWebFontAsset[]> {
  const requests: Array<{
    readonly face: QuireWebFontFamilyManifest["faces"][number];
    readonly asset: QuireWebFontAsset;
  }> = [];
  for (const face of manifest.faces) {
    for (const asset of face.assets) {
      requests.push({ face, asset });
    }
  }
  const installed = new Array<QuireInstalledWebFontAsset>(requests.length);
  let nextRequestIndex = 0;

  /**
   * Downloads successive assets while preserving the shared concurrency ceiling.
   *
   * @returns Completion after this worker exhausts the shared queue.
   */
  async function downloadWorker(): Promise<void> {
    while (nextRequestIndex < requests.length) {
      const index = nextRequestIndex;
      nextRequestIndex += 1;
      const request = requests[index];
      if (request === undefined) return;
      const downloaded = await downloadAsset(manifest, request.asset, options);
      const persistent = await cacheQuireWebFontAsset(
        options.cache,
        manifest,
        request.face,
        request.asset,
        downloaded.data,
        downloaded.digest,
        downloaded.sourceUrl,
        options.now(),
        downloaded.expiresAt
      );
      installed[index] = {
        face: request.face,
        asset: request.asset,
        data: downloaded.data,
        digest: downloaded.digest,
        sourceUrl: downloaded.sourceUrl,
        fromCache: false,
        persistent
      };
    }
  }

  // CJK manifests contain many Unicode shards. A bounded worker pool keeps
  // acquisition practical without creating an unbounded request burst.
  const workerCount = Math.min(options.maxConcurrentAssets, requests.length);
  await Promise.all(Array.from({ length: workerCount }, downloadWorker));
  return installed;
}

/**
 * Tries ordered equivalent mirrors for one asset.
 *
 * @param manifest - Owning provider manifest.
 * @param asset - Asset and mirrors.
 * @param options - Runtime download boundaries.
 * @returns First successfully verified response.
 */
async function downloadAsset(
  manifest: QuireWebFontFamilyManifest,
  asset: QuireWebFontAsset,
  options: QuireWebFontDownloadOptions
): Promise<DownloadedResponse> {
  if (asset.sources.length === 0) {
    throw new QuireWebFontError("catalog", `Asset "${asset.id}" has no sources`, {
      providerId: manifest.providerId
    });
  }
  let lastError: QuireWebFontError | undefined;
  for (const source of asset.sources) {
    try {
      const response = await options.fetch(source.url, {
        mode: "cors",
        credentials: "omit",
        redirect: "follow"
      });
      if (!response.ok) {
        throw new QuireWebFontError("network", `Font request failed with HTTP ${response.status}`, {
          providerId: manifest.providerId,
          url: source.url
        });
      }
      enforceContentLength(response, options.maxAssetBytes, manifest.providerId, source.url);
      const data = await response.arrayBuffer();
      if (data.byteLength > options.maxAssetBytes) {
        throw new QuireWebFontError("size", `Font asset exceeds ${options.maxAssetBytes} bytes`, {
          providerId: manifest.providerId,
          url: source.url
        });
      }
      const digest = asset.integrity === undefined
        ? await computeQuireWebFontSha256(data)
        : await verifyQuireWebFontIntegrity(data, asset.integrity);
      return {
        data,
        digest,
        sourceUrl: source.url,
        ...createExpiry(response, asset, options.now())
      };
    } catch (error) {
      lastError = error instanceof QuireWebFontError
        ? error
        : new QuireWebFontError("network", `Failed to download font asset "${asset.id}"`, {
          providerId: manifest.providerId,
          url: source.url,
          cause: error
        });
    }
  }
  throw lastError ?? new QuireWebFontError("network", `No source served asset "${asset.id}"`);
}

/**
 * Rejects an oversized declared response before allocating its body.
 *
 * @param response - Successful response.
 * @param maximum - Maximum accepted bytes.
 * @param providerId - Active provider.
 * @param url - Active mirror.
 */
function enforceContentLength(
  response: Response,
  maximum: number,
  providerId: string,
  url: string
): void {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maximum) {
    throw new QuireWebFontError("size", `Font asset declares ${declared} bytes`, {
      providerId,
      url
    });
  }
}

/**
 * Resolves response max-age before the manifest fallback lifetime.
 *
 * @param response - Successful response.
 * @param asset - Manifest asset.
 * @param now - Current epoch milliseconds.
 * @returns Optional expiry property.
 */
function createExpiry(
  response: Response,
  asset: QuireWebFontAsset,
  now: number
): { readonly expiresAt?: number } {
  const cacheControl = response.headers.get("cache-control") ?? "";
  const responseAge = cacheControl.match(/(?:^|,)\s*max-age=(\d+)/i)?.[1];
  const seconds = responseAge === undefined ? asset.cacheMaxAgeSeconds : Number(responseAge);
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return {};
  return { expiresAt: now + seconds * 1_000 };
}
