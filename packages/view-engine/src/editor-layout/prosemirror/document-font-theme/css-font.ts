/** CSS generic families that must remain unquoted. */
const cssGenericFamilies = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong"
]);

/**
 * Reads ordered family names from a complete CSS font shorthand.
 *
 * @param font - Complete CSS font shorthand.
 * @returns Unquoted family names after the pixel-size token.
 */
export function readQuireCssFontFamilies(font: string): readonly string[] {
  const match = /(?:^|\s)\d+(?:\.\d+)?px(?:\/[^\s]+)?\s+(.+)$/u.exec(font);
  return match?.[1] === undefined ? [] : splitCssFontFamilies(match[1]);
}

/**
 * Replaces the family suffix of a CSS font shorthand.
 *
 * @param font - CSS font shorthand to update.
 * @param families - Ordered, unquoted family names.
 * @returns Updated shorthand, or the original when no size token exists.
 */
export function replaceQuireCssFontFamilies(
  font: string,
  families: readonly string[]
): string {
  const match = /(?:^|\s)(\d+(?:\.\d+)?px(?:\/[^\s]+)?)(?:\s+.+)$/u.exec(font);
  if (match === null || match.index === undefined || families.length === 0) {
    return font;
  }
  const prefix = font.slice(0, match.index).trim();
  const size = match[1] ?? "";
  const family = families.map(formatQuireCssFontFamily).join(", ");
  return `${prefix.length === 0 ? "" : `${prefix} `}${size} ${family}`;
}

/**
 * Formats one named family for a CSS family list.
 *
 * @param family - Canonical family name.
 * @returns CSS-safe family token.
 */
export function formatQuireCssFontFamily(family: string): string {
  if (cssGenericFamilies.has(family)) {
    return family;
  }
  if (/^[\p{L}\p{N}_-]+$/u.test(family)) {
    return family;
  }
  return `"${family.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}

/**
 * Drops unreachable candidates after the first CSS generic family.
 *
 * A generic family delegates glyph selection to the browser and therefore
 * terminates an exact substitution chain. Keeping later named families creates
 * the false impression that they can still influence layout.
 *
 * @param families - Ordered named and generic family candidates.
 * @returns Candidates through the first generic family, inclusive.
 */
export function terminateQuireCssFontFamilies(
  families: readonly string[]
): readonly string[] {
  const genericIndex = families.findIndex((family) =>
    cssGenericFamilies.has(family.trim().toLocaleLowerCase("en-US"))
  );
  return genericIndex === -1 ? families : families.slice(0, genericIndex + 1);
}

/**
 * Splits one CSS family list while respecting quoted commas.
 *
 * @param familyList - Raw family-list suffix.
 * @returns Unquoted, trimmed family names.
 */
function splitCssFontFamilies(familyList: string): readonly string[] {
  const families: string[] = [];
  let current = "";
  let quote: "\"" | "'" | null = null;
  for (const character of familyList) {
    if ((character === "\"" || character === "'") && quote === null) {
      quote = character;
      continue;
    }
    if (character === quote) {
      quote = null;
      continue;
    }
    if (character === "," && quote === null) {
      appendFamily(families, current);
      current = "";
      continue;
    }
    current += character;
  }
  appendFamily(families, current);
  return families;
}

/**
 * Appends one non-empty parsed family.
 *
 * @param families - Mutable destination family list.
 * @param value - Raw parsed family value.
 * @returns Nothing.
 */
function appendFamily(families: string[], value: string): void {
  const family = value.trim();
  if (family.length > 0) {
    families.push(family);
  }
}
