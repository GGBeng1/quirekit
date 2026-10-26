import type { MathFitOptions } from './types';

/**
 * Chooses the font size at which a formula fits its surface, never enlarging past the base size.
 * Below the minimum the formula keeps the minimum and the surface scrolls instead.
 * @param width - Formula width in em, from the matching layout.
 * @param options - Available width and size bounds in CSS pixels.
 * @returns Font size in CSS pixels.
 */
export function fitMathFontSize(width: number, options: MathFitOptions): number {
  const { available, base } = options;
  const minimum = Math.min(options.minimum ?? 12, base);
  if (!(width > 0) || !(available > 0)) return base;
  return Math.max(minimum, Math.min(base, available / width));
}
