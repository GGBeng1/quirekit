import { decodeSrgbChannel } from "./channels";
import type { QuireSrgbColor } from "./types";

/**
 * Computes WCAG relative luminance.
 *
 * @param color - Normalized sRGB color.
 * @returns Relative luminance from zero through one.
 */
export function quireRelativeLuminance(color: QuireSrgbColor): number {
  return 0.2126 * decodeSrgbChannel(color.r)
    + 0.7152 * decodeSrgbChannel(color.g)
    + 0.0722 * decodeSrgbChannel(color.b);
}

/**
 * Computes the WCAG contrast ratio between two colors.
 *
 * @param first - First normalized sRGB color.
 * @param second - Second normalized sRGB color.
 * @returns Symmetric contrast ratio from one through twenty-one.
 */
export function quireContrastRatio(first: QuireSrgbColor, second: QuireSrgbColor): number {
  const lighter = Math.max(quireRelativeLuminance(first), quireRelativeLuminance(second));
  const darker = Math.min(quireRelativeLuminance(first), quireRelativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}
