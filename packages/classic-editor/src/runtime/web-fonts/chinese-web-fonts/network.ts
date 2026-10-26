import type { ChineseWebFontsRemotePath } from "./directory";

const SOURCE_LABEL = "中文网字计划";
const VERSION_API_BASE = "https://data.jsdelivr.com/v1/package/resolve/npm/@chinese-fonts/";
const JSDELIVR_PACKAGE_CDN_BASE = "https://cdn.jsdelivr.net/npm/@chinese-fonts/";
const UNPKG_PACKAGE_CDN_BASE = "https://unpkg.com/@chinese-fonts/";

/** A provider stylesheet loaded from the CDN that actually served it. */
export interface ChineseWebFontsStylesheet {
  /** Complete provider stylesheet text. */
  readonly css: string;
  /** Successful stylesheet URL used to resolve relative font assets. */
  readonly url: URL;
}

/**
 * Reads and caches one npm package's current published version.
 *
 * @param packageId - Provider package id.
 * @param fetcher - Provider fetch boundary.
 * @param requests - Shared per-package request cache.
 * @returns Published semantic version.
 */
export async function resolveChineseWebFontsPackageVersion(
  packageId: string,
  fetcher: typeof globalThis.fetch,
  requests: Map<string, Promise<string>>
): Promise<string> {
  let request = requests.get(packageId);
  if (request === undefined) {
    const url = new URL(`${encodeURIComponent(packageId)}@latest`, VERSION_API_BASE);
    request = fetchChineseWebFontsJson(url, fetcher).then((value) => {
      if (!isRecord(value) || typeof value.version !== "string" || !value.version.trim()) {
        throw new Error(`${SOURCE_LABEL}字体包“${packageId}”缺少版本信息。`);
      }
      return value.version;
    }).catch((error: unknown) => {
      requests.delete(packageId);
      throw error;
    });
    requests.set(packageId, request);
  }
  return request;
}

/**
 * Creates ordered immutable npm stylesheet mirror URLs.
 *
 * @param packageId - Provider package id.
 * @param version - Resolved npm version.
 * @param remotePath - Repository-relative provider stylesheet path.
 * @returns Absolute versioned stylesheet mirror URLs in preferred order.
 */
export function createChineseWebFontsStylesheetUrls(
  packageId: string,
  version: string,
  remotePath: ChineseWebFontsRemotePath
): readonly URL[] {
  const prefix = `packages/${packageId}/`;
  if (!remotePath.path.startsWith(prefix)) {
    throw new Error(`${SOURCE_LABEL}返回了无效字体路径“${remotePath.path}”。`);
  }
  const packagePath = `${packageId}@${encodeURIComponent(version)}/${
    remotePath.path.slice(prefix.length)
  }`;
  const jsDelivrUrl = new URL(packagePath, JSDELIVR_PACKAGE_CDN_BASE);
  const unpkgUrl = new URL(packagePath, UNPKG_PACKAGE_CDN_BASE);

  // jsDelivr rejects a significant part of this catalog's Unicode paths.
  return /[^\x20-\x7E]/u.test(packagePath)
    ? [unpkgUrl, jsDelivrUrl]
    : [jsDelivrUrl, unpkgUrl];
}

/**
 * Fetches one CORS-readable JSON resource.
 *
 * @param url - Provider resource URL.
 * @param fetcher - Fetch boundary.
 * @returns Unknown JSON body for explicit validation.
 */
export async function fetchChineseWebFontsJson(
  url: URL,
  fetcher: typeof globalThis.fetch
): Promise<unknown> {
  const response = await fetcher(url, { mode: "cors", credentials: "omit" });
  if (!response.ok) throw new Error(`${SOURCE_LABEL}请求失败（HTTP ${response.status}）。`);
  return response.json() as Promise<unknown>;
}

/**
 * Fetches one CORS-readable provider stylesheet with ordered mirror fallback.
 *
 * @param urls - Ordered versioned stylesheet mirror URLs.
 * @param fetcher - Fetch boundary.
 * @returns Complete stylesheet text and the successful mirror URL.
 */
export async function fetchChineseWebFontsStylesheet(
  urls: readonly URL[],
  fetcher: typeof globalThis.fetch
): Promise<ChineseWebFontsStylesheet> {
  const failures: string[] = [];
  let lastError: unknown;

  for (const url of urls) {
    try {
      const response = await fetcher(url, { mode: "cors", credentials: "omit" });
      if (!response.ok) {
        failures.push(`${url.host} HTTP ${response.status}`);
        continue;
      }
      return { css: await response.text(), url };
    } catch (error) {
      lastError = error;
      failures.push(`${url.host} ${toErrorMessage(error)}`);
    }
  }

  throw new Error(
    `${SOURCE_LABEL}样式镜像均不可用（${failures.join("；")}）。`,
    lastError === undefined ? undefined : { cause: lastError }
  );
}

/**
 * Converts an unknown network failure into concise provider diagnostics.
 *
 * @param error - Unknown fetch failure.
 * @returns Visible diagnostic text.
 */
function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Reports whether an unknown JSON value is a non-array object.
 *
 * @param value - Candidate value.
 * @returns Whether the value is record-shaped.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
