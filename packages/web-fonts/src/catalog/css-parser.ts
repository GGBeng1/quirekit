import type {
  QuireWebFontAsset,
  QuireWebFontFace,
  QuireWebFontFormat
} from "../types";
import { QuireWebFontError } from "../types";
import { normalizeQuireWebFontFamily } from "../resource/identity";

/** Options used to parse one provider-owned web-font stylesheet. */
export interface ParseWebFontCssOptions {
  /** Exact CSS family requested from the provider. */
  readonly requestedFamily: string;
  /** Human-readable provider label used in diagnostics. */
  readonly providerLabel: string;
  /** Absolute stylesheet URL used to resolve relative binary references. */
  readonly stylesheetUrl?: URL | undefined;
}

/** Provider-neutral font faces parsed from one CSS stylesheet. */
export interface QuireParsedWebFontCss {
  /** Family spelling declared by the stylesheet. */
  readonly family: string;
  /** Faces grouped by CSS descriptors with Unicode shards preserved. */
  readonly faces: readonly QuireWebFontFace[];
}

/**
 * Parses the controlled `@font-face` subset shared by external CSS providers.
 *
 * @param css - Complete provider stylesheet.
 * @param options - Expected family, provider label, and optional stylesheet URL.
 * @returns Parsed family and descriptor-grouped faces.
 */
export function parseWebFontCss(
  css: string,
  options: ParseWebFontCssOptions
): QuireParsedWebFontCss {
  const blocks = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/@font-face\s*\{([^}]*)\}/gi)];
  const grouped = new Map<string, {
    face: Omit<QuireWebFontFace, "assets">;
    assets: QuireWebFontAsset[];
  }>();
  let responseFamily: string | undefined;

  for (const [blockIndex, match] of blocks.entries()) {
    const declarations = parseDeclarations(match[1] ?? "");
    const family = unquote(declarations.get("font-family") ?? "");
    if (
      normalizeQuireWebFontFamily(family)
      !== normalizeQuireWebFontFamily(options.requestedFamily)
    ) {
      throw new QuireWebFontError(
        "catalog",
        `${options.providerLabel} returned unexpected family "${family || "(missing)"}"`
      );
    }
    responseFamily ??= family;
    const style = declarations.get("font-style") ?? "normal";
    const weight = declarations.get("font-weight") ?? "400";
    const stretch = declarations.get("font-stretch");
    const key = `${style}\u0000${weight}\u0000${stretch ?? "normal"}`;
    const group = grouped.get(key) ?? {
      face: {
        id: createFaceId(style, weight, stretch),
        style,
        weight,
        ...(stretch === undefined ? {} : { stretch })
      },
      assets: []
    };
    const sources = parseSources(
      declarations.get("src") ?? "",
      options.stylesheetUrl,
      options.providerLabel
    );
    if (sources.length === 0) {
      throw new QuireWebFontError(
        "catalog",
        `${options.providerLabel} CSS contained a face without a URL`
      );
    }
    group.assets.push({
      id: `shard-${blockIndex + 1}`,
      sources,
      ...(declarations.has("unicode-range")
        ? { unicodeRange: declarations.get("unicode-range") }
        : {}),
      shaping: false
    });
    grouped.set(key, group);
  }

  if (responseFamily === undefined || grouped.size === 0) {
    throw new QuireWebFontError(
      "catalog",
      `${options.providerLabel} CSS contained no usable font faces`
    );
  }
  return {
    family: responseFamily,
    faces: [...grouped.values()].map(({ face, assets }) => ({ ...face, assets }))
  };
}

/**
 * Parses semicolon-delimited CSS declarations.
 *
 * @param block - Font-face body.
 * @returns Lower-cased property map.
 */
function parseDeclarations(block: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const declaration of block.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 0) continue;
    const property = declaration.slice(0, separator).trim().toLocaleLowerCase("en-US");
    const value = declaration.slice(separator + 1).trim();
    if (property.length > 0 && value.length > 0) declarations.set(property, value);
  }
  return declarations;
}

/**
 * Parses URL and format pairs from one CSS src descriptor.
 *
 * @param source - CSS src descriptor.
 * @param stylesheetUrl - Optional base URL for relative binary references.
 * @param providerLabel - Provider label used in invalid-URL diagnostics.
 * @returns Ordered absolute source candidates.
 */
function parseSources(
  source: string,
  stylesheetUrl: URL | undefined,
  providerLabel: string
): Array<{ url: string; format?: QuireWebFontFormat }> {
  const sources: Array<{ url: string; format?: QuireWebFontFormat }> = [];
  const pattern = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s]+))\s*\)\s*(?:format\(\s*(?:"([^"]+)"|'([^']+)'|([^)\s]+))\s*\))?/gi;
  for (const match of source.matchAll(pattern)) {
    const rawUrl = match[1] ?? match[2] ?? match[3];
    if (rawUrl === undefined) continue;
    let url: string;
    try {
      url = new URL(rawUrl, stylesheetUrl).href;
    } catch (cause) {
      throw new QuireWebFontError(
        "catalog",
        `${providerLabel} CSS contained an invalid font URL`,
        { cause }
      );
    }
    const rawFormat = (match[4] ?? match[5] ?? match[6])?.toLocaleLowerCase("en-US");
    const format = normalizeFormat(rawFormat);
    sources.push(format === undefined ? { url } : { url, format });
  }
  return sources;
}

/**
 * Narrows a CSS format string to a supported container.
 *
 * @param format - Raw CSS format.
 * @returns Supported format or undefined.
 */
function normalizeFormat(format: string | undefined): QuireWebFontFormat | undefined {
  if (format === "woff2" || format === "woff" || format === "truetype" || format === "opentype") {
    return format;
  }
  return undefined;
}

/**
 * Removes matching quotes from a CSS string.
 *
 * @param value - Raw CSS value.
 * @returns Unquoted value.
 */
function unquote(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\""))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Creates a descriptor-derived stable face id.
 *
 * @param style - CSS style.
 * @param weight - CSS weight.
 * @param stretch - Optional CSS stretch.
 * @returns Manifest face id.
 */
function createFaceId(style: string, weight: string, stretch: string | undefined): string {
  return [style, weight, stretch]
    .filter((value) => value !== undefined)
    .join("-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-");
}
