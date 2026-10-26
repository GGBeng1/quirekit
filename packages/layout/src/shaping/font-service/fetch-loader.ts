import type {
  QuireFontServiceSource,
  QuireFontServiceSourceDataLoader
} from "./types";

/** Minimal response contract needed to load font bytes. */
export interface QuireFontFetchResponse {
  /** Whether the request succeeded. */
  readonly ok: boolean;
  /** Numeric response status used in diagnostics. */
  readonly status: number;
  /**
   * Reads the response body as raw bytes.
   *
   * @returns Raw response bytes.
   */
  arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * Minimal fetch function used by the font source data loader.
 *
 * @param url - URL resolved from a font source.
 * @returns Response containing raw font bytes.
 */
export type QuireFontFetchFunction = (
  url: string | URL
) => Promise<QuireFontFetchResponse>;

/** Options for creating a fetch-backed font source data loader. */
export interface QuireFontFetchSourceDataLoaderOptions {
  /** Optional fetch implementation supplied by the host or tests. */
  readonly fetch?: QuireFontFetchFunction;
  /**
   * Resolves the URL for a source before fetching.
   *
   * @param source - Font source metadata.
   * @returns URL to fetch, or undefined to use `source.url`.
   */
  readonly resolveUrl?: (source: QuireFontServiceSource) => string | URL | undefined;
}

/**
 * Creates a host fetch-backed source loader for font service sources.
 *
 * @param options - Optional fetch implementation and URL resolver.
 * @returns Source data loader suitable for `createQuireFontService`.
 */
export function createQuireFontFetchSourceDataLoader(
  options: QuireFontFetchSourceDataLoaderOptions = {}
): QuireFontServiceSourceDataLoader {
  return async (source) => {
    const url = options.resolveUrl?.(source) ?? source.url;

    if (!url) {
      throw new Error(`Canvas font source "${source.id}" is missing a URL`);
    }

    const response = await resolveQuireFontFetch(options.fetch)(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch canvas font source "${source.id}" (${response.status})`
      );
    }

    return response.arrayBuffer();
  };
}

/**
 * Resolves the fetch implementation used by the source data loader.
 *
 * @param fetcher - Optional host-provided fetch implementation.
 * @returns Fetch implementation.
 */
function resolveQuireFontFetch(
  fetcher?: QuireFontFetchFunction
): QuireFontFetchFunction {
  if (fetcher) {
    return fetcher;
  }

  if (typeof globalThis.fetch !== "function") {
    throw new Error("Canvas font source fetch requires a host fetch implementation");
  }

  return (url) => globalThis.fetch(url);
}
