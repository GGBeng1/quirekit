import { parseQuireFontPixelSize } from "@quirekit/renderer";
export { parseQuireFontPixelSize } from "@quirekit/renderer";

/** Default CSS pixel size used when a font shorthand cannot be parsed. */
export const DEFAULT_CANVAS_SHAPER_FONT_SIZE = 16;

/**
 * Resolves the CSS pixel font size used by shaping.
 *
 * @param font - CSS font shorthand.
 * @returns Parsed pixel size, or the default editor font size.
 */
export function resolveQuireFontPixelSize(font: string): number {
  return parseQuireFontPixelSize(font) ?? DEFAULT_CANVAS_SHAPER_FONT_SIZE;
}

