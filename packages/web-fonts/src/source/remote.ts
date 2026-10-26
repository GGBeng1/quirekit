import type { QuireWebFontFamilyManifest } from "../types";
import type {
  QuireFontSourceDescriptor,
  QuireRemoteFontSourceClient,
  QuireRemoteFontSourceLimits
} from "./types";
import {
  parseQuireFontSourceCatalogPage,
  parseQuireFontSourceDescriptor,
  parseQuireRemoteFontFamilyManifest
} from "./validation";

const DEFAULT_LIMITS = Object.freeze({
  maxDescriptorBytes: 64 * 1024,
  maxCatalogBytes: 1024 * 1024,
  maxManifestBytes: 2 * 1024 * 1024,
  maxPageItems: 100
});

/** Options for one declarative remote source client. */
export interface CreateQuireRemoteFontSourceClientOptions extends QuireRemoteFontSourceLimits {
  /** Optional fetch boundary used by every protocol request. */
  readonly fetch?: typeof globalThis.fetch | undefined;
}

/**
 * Creates a credentials-omitting JSON client for V1 remote font sources.
 *
 * @param options - Optional fetch boundary and bounded response limits.
 * @returns Validating declarative source client.
 */
export function createQuireRemoteFontSourceClient(
  options: CreateQuireRemoteFontSourceClientOptions = {}
): QuireRemoteFontSourceClient {
  const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  const limits = {
    maxDescriptorBytes: options.maxDescriptorBytes ?? DEFAULT_LIMITS.maxDescriptorBytes,
    maxCatalogBytes: options.maxCatalogBytes ?? DEFAULT_LIMITS.maxCatalogBytes,
    maxManifestBytes: options.maxManifestBytes ?? DEFAULT_LIMITS.maxManifestBytes,
    maxPageItems: options.maxPageItems ?? DEFAULT_LIMITS.maxPageItems
  };

  return {
    /** @inheritdoc */
    async loadDescriptor(descriptorUrl) {
      const url = requireHttpsUrl(descriptorUrl, "descriptor URL");
      const value = await fetchJson(url, limits.maxDescriptorBytes, fetcher);
      return parseQuireFontSourceDescriptor(value, url.href);
    },
    /** @inheritdoc */
    async browse(descriptor, request) {
      if (!Number.isSafeInteger(request.limit) || request.limit < 1
        || request.limit > limits.maxPageItems) {
        throw new RangeError(`Font source page size must be between 1 and ${limits.maxPageItems}.`);
      }
      const url = new URL(descriptor.catalogUrl);
      url.searchParams.set("query", request.query.trim());
      url.searchParams.set("limit", String(request.limit));
      for (const subset of normalizeRequestedSubsets(request.subsets)) {
        url.searchParams.append("subset", subset);
      }
      if (request.cursor !== undefined) url.searchParams.set("cursor", request.cursor);
      const value = await fetchJson(
        url,
        limits.maxCatalogBytes,
        fetcher,
        createAuthenticationHeaders(descriptor, request.settings)
      );
      return parseQuireFontSourceCatalogPage(value, limits.maxPageItems);
    },
    /** @inheritdoc */
    async resolveFamily(descriptor, request): Promise<QuireWebFontFamilyManifest> {
      const url = new URL(descriptor.resolveUrl);
      url.searchParams.set("familyId", request.familyId);
      url.searchParams.set("version", request.version);
      const value = await fetchJson(
        url,
        limits.maxManifestBytes,
        fetcher,
        createAuthenticationHeaders(descriptor, request.settings)
      );
      return parseQuireRemoteFontFamilyManifest(
        value,
        descriptor,
        request.familyId,
        request.version
      );
    }
  };
}

/**
 * Normalizes and deduplicates optional subset filters before URL serialization.
 *
 * @param subsets - Product-requested provider subset tokens.
 * @returns Stable non-empty tokens in caller order.
 */
function normalizeRequestedSubsets(
  subsets: readonly string[] | undefined
): readonly string[] {
  if (subsets === undefined) return [];
  return [...new Set(subsets.map((subset) => (
    subset.trim().toLocaleLowerCase("en-US").replaceAll("_", "-")
  )).filter(Boolean))];
}

/**
 * Fetches one bounded application/json response with no ambient credentials.
 *
 * @param url - Validated protocol endpoint.
 * @param maxBytes - Maximum accepted response size.
 * @param fetcher - Explicit protocol fetch boundary.
 * @param headers - Locally derived request headers.
 * @returns Parsed JSON value.
 */
async function fetchJson(
  url: URL,
  maxBytes: number,
  fetcher: typeof globalThis.fetch,
  headers: Readonly<Record<string, string>> = {}
): Promise<unknown> {
  const response = await fetcher(url, {
    mode: "cors",
    credentials: "omit",
    redirect: "error",
    referrerPolicy: "no-referrer",
    headers: { accept: "application/json", ...headers }
  });
  if (!response.ok) throw new Error(`Font source request failed with HTTP ${response.status}.`);
  if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    throw new TypeError("Font source response must use application/json.");
  }
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RangeError(`Font source response exceeds ${maxBytes} bytes.`);
  }
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new RangeError(`Font source response exceeds ${maxBytes} bytes.`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new TypeError("Font source response contains invalid JSON.");
  }
}

/**
 * Builds one provider auth header from origin-local settings only.
 *
 * @param descriptor - Validated source descriptor.
 * @param settings - Origin-local source settings.
 * @returns Empty or single authentication header.
 */
function createAuthenticationHeaders(
  descriptor: QuireFontSourceDescriptor,
  settings: Readonly<Record<string, string>> | undefined
): Readonly<Record<string, string>> {
  const authentication = descriptor.authentication;
  if (authentication.type === "none") return {};
  const value = settings?.[authentication.settingKey]?.trim();
  if (!value) throw new Error(`Missing local font source setting "${authentication.settingKey}".`);
  return { [authentication.headerName]: `${authentication.prefix ?? ""}${value}` };
}

/**
 * Requires one absolute HTTPS URL without embedded credentials.
 *
 * @param value - User-supplied URL text.
 * @param label - Diagnostic field label.
 * @returns Valid absolute HTTPS URL.
 */
function requireHttpsUrl(value: string, label: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new TypeError(`${label} must use HTTPS.`);
  if (url.username || url.password) throw new TypeError(`${label} must not embed credentials.`);
  return url;
}
