import type { QuireComplexScriptEmphasis } from "./types";

/** CSS pixel density of point units. */
const cssPixelsPerPoint = 96 / 72;

/** Product fallback font family QuireKit expects hosts to load first. */
export const QUIREKIT_DEFAULT_FONT_FAMILY = "DejaVu Sans";

/** Ordered shaping fallback families for QuireKit's default font policy. */
export const QUIREKIT_DEFAULT_FONT_FALLBACK_FAMILIES = [
  QUIREKIT_DEFAULT_FONT_FAMILY,
  "sans-serif"
] as const;

/** CSS family stack used by canvas, SVG, and HTML rendering defaults. */
export const QUIREKIT_DEFAULT_CANVAS_FONT_FAMILY_STACK =
  `"${QUIREKIT_DEFAULT_FONT_FAMILY}", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;

/** Default CSS font shorthand shared by layout measurement and rendering. */
export const QUIREKIT_DEFAULT_CANVAS_FONT =
  `16px ${QUIREKIT_DEFAULT_CANVAS_FONT_FAMILY_STACK}`;

/**
 * Formats a font-family value for installation into a CSS font shorthand.
 *
 * A family list is never wrapped as one quoted name: only a single family that
 * needs quoting is quoted, so `Times New Roman, serif` keeps its list shape.
 *
 * @param fontFamily - Raw CSS font-family value.
 * @returns Family value with single family names quoted when required.
 */
export function formatQuireFontFamily(fontFamily: string): string {
  const trimmed = fontFamily.trim();
  if (
    trimmed.includes(",")
    || trimmed.startsWith("\"")
    || trimmed.startsWith("'")
    || !/\s/u.test(trimmed)
  ) {
    return trimmed;
  }
  return `"${trimmed.replaceAll("\"", "\\\"")}"`;
}

/**
 * Replaces the family portion of a CSS font shorthand.
 *
 * The size token is the anchor: it stays authoritative so a caller can install a
 * new family without restating size, weight, or style.
 *
 * @param baseFont - CSS font shorthand to update.
 * @param fontFamily - CSS font-family value to install.
 * @returns Font shorthand carrying the provided family, or the input unchanged.
 */
export function replaceQuireFontFamily(
  baseFont: string,
  fontFamily: string
): string {
  const sizeMatch = /(?:^|\s)(\d+(?:\.\d+)?px(?:\/[^\s]+)?)(?:\s|$)/u.exec(baseFont);
  if (!sizeMatch) return baseFont;

  const prefix = baseFont.slice(0, sizeMatch.index).trim();
  const size = sizeMatch[1] ?? "";
  const family = formatQuireFontFamily(fontFamily);
  return `${prefix.length === 0 ? "" : `${prefix} `}${size} ${family}`;
}

/**
 * Scales the pixel size in a CSS font shorthand.
 *
 * @param font - CSS font shorthand to scale.
 * @param scale - Multiplier applied to the pixel size.
 * @returns Font shorthand with the scaled size.
 */
export function scaleQuireFontSize(font: string, scale: number): string {
  return font.replace(/(\d+(?:\.\d+)?)px/u, (_, size: string) => `${Number(size) * scale}px`);
}

/**
 * Replaces the pixel size token in a CSS font shorthand with an absolute size.
 *
 * Used for an absolute mark font-size (e.g. a font-size control) overriding the
 * inherited/scaled size, mirroring CSS where an explicit `font-size` wins. The
 * line box grows to fit an oversized inline size via the run's font metrics, so
 * a larger run lifts its line and the glyphs sit on the shared baseline.
 *
 * @param font - CSS font shorthand to update.
 * @param size - Absolute px size token (e.g. `"18px"`).
 * @returns Font shorthand with the absolute size.
 */
export function replaceQuireFontSize(font: string, size: string): string {
  return font.replace(/\d+(?:\.\d+)?px/u, size);
}

/**
 * Projects one mark font-size into the CSS pixel token consumed by Canvas.
 *
 * The canonical text-style model stores Word-compatible point values, while
 * the layout measurer and Canvas font shorthand operate in CSS pixels. Legacy
 * pixel values remain accepted for HTML-authored content.
 *
 * @param value - Candidate mark font-size.
 * @returns CSS pixel token, or null when the value is unsupported.
 */
export function resolveQuireCanvasFontSize(value: string): string | null {
  const match = /^(\d+(?:\.\d+)?)(px|pt)$/u.exec(value.trim());

  if (match === null) {
    return null;
  }

  const size = Number(match[1]);
  const unit = match[2];
  const cssPixels = unit === "pt" ? size * cssPixelsPerPoint : size;

  return `${roundQuireCssPixelSize(cssPixels)}px`;
}

/**
 * Rounds a CSS pixel size enough to keep font tokens deterministic.
 *
 * @param value - Raw CSS pixel size.
 * @returns Pixel size rounded to six fractional digits.
 */
export function roundQuireCssPixelSize(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/**
 * Applies one script-specific emphasis override to an itemized CSS font.
 *
 * @param font - Slot-specific CSS font shorthand.
 * @param emphasis - Complex-script weight/style override.
 * @returns Font shorthand retaining size, caps variant, and family order.
 */
export function applyQuireComplexScriptEmphasis(
  font: string,
  emphasis: QuireComplexScriptEmphasis
): string {
  const sizeIndex = font.search(/\d+(?:\.\d+)?px/u);
  if (sizeIndex < 0) return font;
  const prefixes = font.slice(0, sizeIndex).trim().split(/\s+/u).filter((token) => (
    token.length > 0
    && token !== "normal"
    && token !== "bold"
    && token !== "italic"
    && token !== "oblique"
  ));
  if (emphasis.fontStyle === "italic") prefixes.unshift("italic");
  if (emphasis.fontWeight === "bold") prefixes.push("bold");
  const resolvedSize = emphasis.fontSize === undefined
    ? null
    : resolveQuireCanvasFontSize(emphasis.fontSize);
  const suffix = resolvedSize === null
    ? font.slice(sizeIndex)
    : replaceQuireFontSize(font.slice(sizeIndex), resolvedSize);
  return prefixes.length === 0 ? suffix : `${prefixes.join(" ")} ${suffix}`;
}
