import { ooxmlHighlightCssColors, wordHighlightPaletteRows } from "@quirekit/extension-text-style";

/** Uppercase paint color for every highlight token a picker can show; `none` is the no-color state. */
const highlightHexByToken = new Map(Object.entries(ooxmlHighlightCssColors)
  .filter(([token]) => token !== "none")
  .map(([token, color]) => [token, color.toUpperCase()]));
const highlightTokenByHex = new Map([...highlightHexByToken].map(([token, color]) => [color, token]));

/** Word's 3 × 5 highlighter gallery as picker hex rows. */
export const classicHighlightPaletteRows: readonly (readonly string[])[] =
  wordHighlightPaletteRows.map(row => row.map(token => highlightHexByToken.get(token)!));

/**
 * Converts a stored highlight token to the picker color.
 *
 * @param token - Highlight mark color.
 * @returns Uppercase hex color, or null for `none`, absent or unknown tokens.
 */
export function resolveClassicHighlightHex(token: unknown): string | null {
  return typeof token === "string" ? highlightHexByToken.get(token) ?? null : null;
}

/**
 * Converts a picker color back to the OOXML token it represents.
 *
 * @param color - Hex color emitted by a highlight picker.
 * @returns Highlight token, or undefined when the color is outside the value space.
 */
export function resolveClassicHighlightToken(color: string): string | undefined {
  return highlightTokenByHex.get(color.toUpperCase());
}
