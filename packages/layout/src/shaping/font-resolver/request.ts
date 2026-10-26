import type { QuireFontRequest } from "./types";

/** Default font style used when a CSS shorthand omits style. */
const DEFAULT_FONT_STYLE = "normal";

/** Default font weight used when a CSS shorthand omits weight. */
const DEFAULT_FONT_WEIGHT = 400;

/** CSS generic families that should stay valid fallback candidates. */
const CSS_GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "emoji",
  "math",
  "fangsong"
]);

/**
 * Parses the family, style, and weight portions of a CSS font shorthand.
 *
 * @param font - CSS font shorthand.
 * @returns Parsed font request used by the font resolver.
 */
export function parseQuireFontRequest(font: string): QuireFontRequest {
  const sizeMatch = /(?:^|\s)(\d+(?:\.\d+)?)px(?:\/[^\s]+)?(?:\s|$)/u.exec(font);
  const beforeSize = sizeMatch ? font.slice(0, sizeMatch.index).trim() : "";
  const afterSize = sizeMatch ? font.slice(sizeMatch.index + sizeMatch[0].length).trim() : font;

  return {
    families: parseQuireFontFamilies(afterSize),
    style: resolveQuireFontStyle(beforeSize),
    weight: resolveQuireFontWeight(beforeSize)
  };
}

/**
 * Normalizes a CSS font family name for matching.
 *
 * @param family - Raw CSS font family.
 * @returns Case-insensitive normalized family name.
 */
export function normalizeQuireFontFamily(family: string): string {
  return unquoteCssFontFamily(family).trim().toLowerCase();
}

/**
 * Parses a comma-delimited CSS font-family list.
 *
 * @param familyList - CSS family list after the size token.
 * @returns Ordered family names.
 */
function parseQuireFontFamilies(familyList: string): readonly string[] {
  const families = splitCssFontFamilies(familyList)
    .map((family) => unquoteCssFontFamily(family).trim())
    .filter((family) => family.length > 0);

  return families.length > 0 ? families : ["sans-serif"];
}

/**
 * Splits a CSS font-family list while respecting quoted family names.
 *
 * @param familyList - Raw CSS family list.
 * @returns Raw family segments.
 */
function splitCssFontFamilies(familyList: string): readonly string[] {
  const families: string[] = [];
  let current = "";
  let quote: "\"" | "'" | null = null;

  for (const character of familyList) {
    if ((character === "\"" || character === "'") && quote === null) {
      quote = character;
      current += character;
      continue;
    }

    if (character === quote) {
      quote = null;
      current += character;
      continue;
    }

    if (character === "," && quote === null) {
      families.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  families.push(current);

  return families;
}

/**
 * Removes matching CSS quotes around a family name.
 *
 * @param family - Raw CSS font family.
 * @returns Unquoted family name.
 */
function unquoteCssFontFamily(family: string): string {
  const trimmed = family.trim();

  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

/**
 * Resolves CSS font style from shorthand tokens before the size token.
 *
 * @param prefix - Shorthand prefix before size.
 * @returns CSS font style.
 */
function resolveQuireFontStyle(prefix: string): string {
  return /\bitalic\b/u.test(prefix) ? "italic" : DEFAULT_FONT_STYLE;
}

/**
 * Resolves numeric CSS font weight from shorthand tokens before the size token.
 *
 * @param prefix - Shorthand prefix before size.
 * @returns Numeric CSS font weight.
 */
function resolveQuireFontWeight(prefix: string): number {
  const numericWeight = /\b([1-9]00)\b/u.exec(prefix)?.[1];

  if (numericWeight) {
    return Number(numericWeight);
  }

  if (/\bbold\b/u.test(prefix)) {
    return 700;
  }

  return DEFAULT_FONT_WEIGHT;
}

/**
 * Returns whether a font family is a CSS generic family.
 *
 * @param family - CSS font family.
 * @returns Whether the family is generic.
 */
export function isQuireGenericFontFamily(family: string): boolean {
  return CSS_GENERIC_FAMILIES.has(normalizeQuireFontFamily(family));
}
