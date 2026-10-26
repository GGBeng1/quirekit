import { ooxmlHighlightCssColors } from "./palette";

/** CSS basic color keywords; Word's highlight palette is exactly this set. */
const cssKeywordTokens: Readonly<Record<string, string>> = Object.freeze({
  yellow: "yellow", lime: "green", aqua: "cyan", cyan: "cyan", fuchsia: "magenta",
  magenta: "magenta", blue: "blue", red: "red", navy: "darkBlue", teal: "darkCyan",
  green: "darkGreen", purple: "darkMagenta", maroon: "darkRed", olive: "darkYellow",
  gray: "darkGray", grey: "darkGray", silver: "lightGray", black: "black", white: "white"
});

/** Chromatic tokens grouped by hue, as [hue, bright token, dark token]. */
const chromaticTokens: readonly (readonly [number, string, string])[] = [
  [0, "red", "darkRed"],
  [60, "yellow", "darkYellow"],
  [120, "green", "darkGreen"],
  [180, "cyan", "darkCyan"],
  [240, "blue", "darkBlue"],
  [300, "magenta", "darkMagenta"]
];

const tokenByLowercase = new Map(Object.keys(ooxmlHighlightCssColors).map(token => [token.toLowerCase(), token]));
const tokenByHex = new Map(Object.entries(ooxmlHighlightCssColors)
  .filter(([token]) => token !== "none")
  .map(([token, color]) => [color.toLowerCase(), token]));

/**
 * Canonicalizes an OOXML `ST_HighlightColor` value.
 *
 * @param value - Candidate token from the model, DOCX or QuireKit HTML.
 * @returns Canonical token including `none`, or null when the value is not in the value space.
 */
export function normalizeHighlightToken(value: unknown): string | null {
  return typeof value === "string" ? tokenByLowercase.get(value.trim().toLowerCase()) ?? null : null;
}

/**
 * Projects a CSS color onto the 16 highlight colors.
 *
 * Exact palette colors and CSS basic keywords map losslessly; other opaque
 * colors take the nearest hue with a bright/dark choice, and low-saturation
 * colors fall onto the gray ramp. White is only produced by an exact match,
 * because an approximated white highlight is invisible on the page.
 *
 * @param value - CSS color as reported by `style.backgroundColor`.
 * @returns Highlight token, `null` for transparent paint, or undefined when the color cannot be parsed.
 */
export function resolveHighlightTokenFromCss(value: string): string | null | undefined {
  const color = value.trim().toLowerCase();
  if (color === "transparent") return null;
  const keyword = cssKeywordTokens[color];
  if (keyword !== undefined) return keyword;
  const rgb = parseCssRgb(color);
  if (rgb === undefined) return undefined;
  if (rgb.alpha === 0) return null;
  const hex = `#${[rgb.red, rgb.green, rgb.blue].map(channel => channel.toString(16).padStart(2, "0")).join("")}`;
  return tokenByHex.get(hex) ?? approximateHighlightToken(rgb.red, rgb.green, rgb.blue);
}

/**
 * Parses hex and `rgb()`/`rgba()` CSS colors.
 *
 * @param color - Lowercase trimmed CSS color.
 * @returns Integer channels with alpha from 0 to 1, or undefined for other syntaxes.
 */
function parseCssRgb(color: string): { red: number; green: number; blue: number; alpha: number } | undefined {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/u.exec(color)?.[1];
  if (hex !== undefined) {
    const full = hex.length === 3 ? [...hex].map(digit => digit + digit).join("") : hex;
    return { red: parseInt(full.slice(0, 2), 16), green: parseInt(full.slice(2, 4), 16), blue: parseInt(full.slice(4, 6), 16), alpha: 1 };
  }
  const channels = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/u.exec(color);
  if (channels === null) return undefined;
  const [red, green, blue] = channels.slice(1, 4).map(channel => Math.min(255, Number(channel)));
  return { red: red!, green: green!, blue: blue!, alpha: channels[4] === undefined ? 1 : Number(channels[4]) };
}

/**
 * Chooses the perceptually closest palette token by hue and lightness.
 *
 * @param red - Red channel 0–255.
 * @param green - Green channel 0–255.
 * @param blue - Blue channel 0–255.
 * @returns Highlight token other than white and none.
 */
function approximateHighlightToken(red: number, green: number, blue: number): string {
  const max = Math.max(red, green, blue) / 255;
  const min = Math.min(red, green, blue) / 255;
  const lightness = (max + min) / 2;
  const delta = max - min;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  if (saturation < 0.2) return lightness < 0.25 ? "black" : lightness < 0.6 ? "darkGray" : "lightGray";
  const hue = resolveHue(red / 255, green / 255, blue / 255, max, delta);
  const [, bright, dark] = chromaticTokens.reduce((best, entry) =>
    hueDistance(entry[0], hue) < hueDistance(best[0], hue) ? entry : best);
  return lightness < 0.3 ? dark : bright;
}

/**
 * Computes the HSL hue angle.
 *
 * @param red - Red channel 0–1.
 * @param green - Green channel 0–1.
 * @param blue - Blue channel 0–1.
 * @param max - Largest channel.
 * @param delta - Largest minus smallest channel; positive.
 * @returns Hue in degrees from 0 up to 360.
 */
function resolveHue(red: number, green: number, blue: number, max: number, delta: number): number {
  const sector = max === red ? ((green - blue) / delta) % 6 : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
  return (sector * 60 + 360) % 360;
}

/**
 * Measures the circular distance between two hues.
 *
 * @param left - First hue in degrees.
 * @param right - Second hue in degrees.
 * @returns Distance from 0 to 180 degrees.
 */
function hueDistance(left: number, right: number): number {
  const distance = Math.abs(left - right) % 360;
  return distance > 180 ? 360 - distance : distance;
}
