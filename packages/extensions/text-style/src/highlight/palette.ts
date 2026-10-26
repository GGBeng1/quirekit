/** OOXML `ST_HighlightColor` tokens mapped to Word's paint colors. */
export const ooxmlHighlightCssColors: Readonly<Record<string, string>> = Object.freeze({
  black: "#000000",
  blue: "#0000ff",
  cyan: "#00ffff",
  darkBlue: "#000080",
  darkCyan: "#008080",
  darkGray: "#808080",
  darkGreen: "#008000",
  darkMagenta: "#800080",
  darkRed: "#800000",
  darkYellow: "#808000",
  green: "#00ff00",
  lightGray: "#c0c0c0",
  magenta: "#ff00ff",
  none: "transparent",
  red: "#ff0000",
  white: "#ffffff",
  yellow: "#ffff00"
});

/** Word's highlighter gallery: three rows of five named colors, without white or none. */
export const wordHighlightPaletteRows: readonly (readonly string[])[] = Object.freeze([
  Object.freeze(["yellow", "green", "cyan", "magenta", "blue"]),
  Object.freeze(["red", "darkBlue", "darkCyan", "darkGreen", "darkMagenta"]),
  Object.freeze(["darkRed", "darkYellow", "darkGray", "lightGray", "black"])
]);

/**
 * Resolves OOXML named highlight tokens to CSS paint colors.
 *
 * @param color - Canonical highlight token or CSS color.
 * @returns CSS-compatible paint color.
 */
export function resolveHighlightCssColor(color: string): string {
  return ooxmlHighlightCssColors[color] ?? color;
}
