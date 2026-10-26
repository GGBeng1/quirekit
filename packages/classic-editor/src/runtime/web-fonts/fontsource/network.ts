import type {
  FontsourceDirectoryItem,
  FontsourceFamilyDetails,
  FontsourceVariantSubset
} from "./types";

const DIRECTORY_URL = "https://api.fontsource.org/v1/fonts";
const MAX_DIRECTORY_BYTES = 8 * 1024 * 1024;
const MAX_DETAILS_BYTES = 2 * 1024 * 1024;

/**
 * Fetches and validates the public Fontsource family directory.
 *
 * @param fetcher - Explicit metadata fetch boundary.
 * @returns Valid provider directory rows.
 */
export async function fetchFontsourceDirectory(
  fetcher: typeof globalThis.fetch
): Promise<readonly FontsourceDirectoryItem[]> {
  const value = await fetchJson(DIRECTORY_URL, MAX_DIRECTORY_BYTES, fetcher);
  if (!Array.isArray(value)) throw new TypeError("Fontsource directory must be an array.");
  return value.flatMap(parseDirectoryItem);
}

/**
 * Fetches and validates one exact Fontsource family metadata record.
 *
 * @param familyId - Stable Fontsource slug.
 * @param fetcher - Explicit metadata fetch boundary.
 * @returns Valid exact provider metadata.
 */
export async function fetchFontsourceFamilyDetails(
  familyId: string,
  fetcher: typeof globalThis.fetch
): Promise<FontsourceFamilyDetails> {
  const value = await fetchJson(
    `${DIRECTORY_URL}/${encodeURIComponent(familyId)}`,
    MAX_DETAILS_BYTES,
    fetcher
  );
  const [base] = parseDirectoryItem(value);
  if (base === undefined || !isRecord(value)) {
    throw new TypeError(`Fontsource returned invalid metadata for "${familyId}".`);
  }
  const npmVersion = requireString(value.npmVersion, "npm version");
  const variants = parseVariants(value.variants);
  const unicodeRange = parseStringRecord(value.unicodeRange);
  return { ...base, npmVersion, variants, unicodeRange };
}

/**
 * Fetches one bounded JSON response without ambient credentials.
 *
 * @param url - Absolute Fontsource metadata URL.
 * @param maxBytes - Maximum accepted response size.
 * @param fetcher - Explicit metadata fetch boundary.
 * @returns Parsed JSON value.
 */
async function fetchJson(
  url: string,
  maxBytes: number,
  fetcher: typeof globalThis.fetch
): Promise<unknown> {
  const response = await fetcher(url, {
    mode: "cors",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    headers: { accept: "application/json" }
  });
  if (!response.ok) throw new Error(`Fontsource request failed with HTTP ${response.status}.`);
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new RangeError(`Fontsource response exceeds ${maxBytes} bytes.`);
  }
  return JSON.parse(text) as unknown;
}

/**
 * Parses one permissive provider directory row.
 *
 * @param value - Unknown directory entry.
 * @returns Empty or single validated row.
 */
function parseDirectoryItem(value: unknown): readonly FontsourceDirectoryItem[] {
  if (!isRecord(value)) return [];
  try {
    const subsets = parseStringArray(value.subsets);
    const weights = parseNumberArray(value.weights);
    const styles = parseStringArray(value.styles);
    return [{
      id: requireString(value.id, "family id"),
      family: requireString(value.family, "family"),
      subsets,
      weights,
      styles,
      defSubset: requireString(value.defSubset, "default subset"),
      lastModified: requireString(value.lastModified, "last modified"),
      category: requireString(value.category, "category"),
      license: requireString(value.license, "license")
    }];
  } catch {
    return [];
  }
}

/**
 * Parses the nested provider asset map while dropping malformed leaves.
 *
 * @param value - Unknown variant map.
 * @returns Valid nested weight, style, and subset assets.
 */
function parseVariants(value: unknown): FontsourceFamilyDetails["variants"] {
  if (!isRecord(value)) return {};
  const variants: Record<string, Record<string, Record<string, FontsourceVariantSubset>>> = {};
  for (const [weight, styles] of Object.entries(value)) {
    if (!isRecord(styles)) continue;
    for (const [style, subsets] of Object.entries(styles)) {
      if (!isRecord(subsets)) continue;
      for (const [subset, candidate] of Object.entries(subsets)) {
        if (!isRecord(candidate)) continue;
        const url = parseStringRecord(candidate.url);
        if (Object.keys(url).length === 0) continue;
        variants[weight] ??= {};
        variants[weight][style] ??= {};
        variants[weight][style][subset] = { url };
      }
    }
  }
  return variants;
}

/**
 * Parses a string-only record.
 *
 * @param value - Unknown record candidate.
 * @returns String-only entries or an empty record.
 */
function parseStringRecord(value: unknown): Readonly<Record<string, string>> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string"
  ));
}

/**
 * Parses a string array while rejecting mixed arrays.
 *
 * @param value - Unknown array candidate.
 * @returns Valid string array.
 */
function parseStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new TypeError("Fontsource metadata contains an invalid string array.");
  }
  return value;
}

/**
 * Parses a finite number array while rejecting mixed arrays.
 *
 * @param value - Unknown array candidate.
 * @returns Valid finite-number array.
 */
function parseNumberArray(value: unknown): readonly number[] {
  if (!Array.isArray(value) || value.some(
    (entry) => typeof entry !== "number" || !Number.isFinite(entry)
  )) throw new TypeError("Fontsource metadata contains an invalid number array.");
  return value;
}

/**
 * Requires one non-empty provider string.
 *
 * @param value - Unknown provider field.
 * @param label - Diagnostic field label.
 * @returns Valid provider string.
 */
function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`Fontsource ${label} must be a non-empty string.`);
  }
  return value;
}

/**
 * Reports whether one value is a non-array object.
 *
 * @param value - Unknown candidate.
 * @returns Whether the value is a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
