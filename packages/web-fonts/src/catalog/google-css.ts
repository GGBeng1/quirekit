import type {
  QuireWebFontCatalog,
  QuireWebFontFamilyManifest,
  QuireWebFontFetch,
  QuireWebFontLicenseNotice
} from "../types";
import { QuireWebFontError } from "../types";
import { normalizeQuireWebFontFamily } from "../resource/identity";
import { parseGoogleFontsCss } from "./google-css-parser";

/** One explicitly enabled Google Fonts CSS2 family. */
export interface GoogleFontsCssFamilyOptions {
  /** Exact Google Fonts family name. */
  readonly family: string;
  /** Requested static weights. Defaults to 400. */
  readonly weights?: readonly number[] | undefined;
  /** Requested styles. Defaults to normal. */
  readonly styles?: readonly ("normal" | "italic")[] | undefined;
  /** Host-overridden family license notice. */
  readonly license?: QuireWebFontLicenseNotice | undefined;
}

/** Options for the allowlisted Google Fonts CSS2 catalog. */
export interface GoogleFontsCssCatalogOptions {
  /** Families the host explicitly makes discoverable. */
  readonly families: readonly GoogleFontsCssFamilyOptions[];
  /** Optional fetch implementation. */
  readonly fetch?: QuireWebFontFetch | undefined;
}

/**
 * Creates an opt-in Google Fonts CSS2 catalog without bundling font bytes.
 *
 * @param options - Explicit family allowlist and optional fetch boundary.
 * @returns Lazy catalog that contacts Google only during family resolution.
 */
export function createGoogleFontsCssCatalog(
  options: GoogleFontsCssCatalogOptions
): QuireWebFontCatalog {
  const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  const families = new Map<string, GoogleFontsCssFamilyOptions>();
  const resolutions = new Map<string, Promise<QuireWebFontFamilyManifest>>();
  for (const entry of options.families) {
    const key = normalizeQuireWebFontFamily(entry.family);
    if (key.length === 0 || families.has(key)) {
      throw new QuireWebFontError("catalog", `Invalid or duplicate Google Fonts family "${entry.family}"`);
    }
    families.set(key, entry);
  }

  return {
    id: "google-fonts",
    /** @inheritdoc */
    async resolveFamily(family: string): Promise<QuireWebFontFamilyManifest | null> {
      const key = normalizeQuireWebFontFamily(family);
      const configured = families.get(key);
      if (configured === undefined) return null;
      let resolution = resolutions.get(key);
      if (resolution === undefined) {
        resolution = resolveGoogleFamily(configured, fetcher).catch((error: unknown) => {
          resolutions.delete(key);
          throw error;
        });
        resolutions.set(key, resolution);
      }
      return resolution;
    }
  };
}

/**
 * Fetches and parses one configured Google Fonts stylesheet.
 *
 * @param configured - Host-enabled family and axes.
 * @param fetcher - Metadata fetch boundary.
 * @returns Complete provider manifest.
 */
async function resolveGoogleFamily(
  configured: GoogleFontsCssFamilyOptions,
  fetcher: QuireWebFontFetch
): Promise<QuireWebFontFamilyManifest> {
  const url = createGoogleCssUrl(configured);
  let response: Response;
  try {
    response = await fetcher(url, { mode: "cors", credentials: "omit" });
  } catch (cause) {
    throw new QuireWebFontError("catalog", `Failed to resolve Google Fonts family "${configured.family}"`, {
      providerId: "google-fonts",
      url: url.href,
      cause
    });
  }
  if (!response.ok) {
    throw new QuireWebFontError(
      "catalog",
      `Google Fonts CSS request failed with HTTP ${response.status}`,
      { providerId: "google-fonts", url: url.href }
    );
  }
  const parsed = parseGoogleFontsCss(await response.text(), configured.family);
  return {
    providerId: "google-fonts",
    family: parsed.family,
    version: parsed.version,
    license: configured.license ?? createGoogleLicenseNotice(configured.family),
    faces: parsed.faces
  };
}

/**
 * Builds a CSS2 request without sending document text.
 *
 * @param configured - Family, styles, and weights.
 * @returns Google Fonts CSS2 URL.
 */
function createGoogleCssUrl(configured: GoogleFontsCssFamilyOptions): URL {
  const weights = [...new Set(configured.weights ?? [400])].sort((left, right) => left - right);
  const styles = [...new Set(configured.styles ?? ["normal"])]
    .sort((left, right) => Number(left === "italic") - Number(right === "italic"));
  if (weights.some((weight) => !Number.isInteger(weight) || weight < 1 || weight > 1000)) {
    throw new QuireWebFontError("catalog", `Invalid weight configured for "${configured.family}"`);
  }
  const url = new URL("https://fonts.googleapis.com/css2");
  let query = configured.family.trim().replace(/\s+/g, " ");
  if (styles.includes("italic")) {
    const tuples = styles.flatMap((style) =>
      weights.map((weight) => `${style === "italic" ? 1 : 0},${weight}`)
    );
    query += `:ital,wght@${tuples.join(";")}`;
  } else {
    query += `:wght@${weights.join(";")}`;
  }
  url.searchParams.set("family", query);
  url.searchParams.set("display", "swap");
  return url;
}

/**
 * Creates a family-specific Google Fonts license-information link.
 *
 * @param family - Configured family.
 * @returns Provider notice for host authorization UI.
 */
function createGoogleLicenseNotice(family: string): QuireWebFontLicenseNotice {
  const slug = family.trim().replace(/\s+/g, "+");
  return {
    name: "Google Fonts license information",
    url: `https://fonts.google.com/specimen/${encodeURIComponent(slug).replace(/%2B/g, "+")}/about`
  };
}
