import type { WordTableVerticalAlignment, WordTableWidth } from "../types";

/**
 * Converts a Word-compatible width to portable CSS.
 *
 * @param width - Width value to convert.
 * @returns CSS width, or null for automatic and unavailable values.
 */
export function wordTableWidthToCss(width: WordTableWidth | null): string | null {
  if (!width || width.value === null || width.unit === "auto" || width.unit === "nil") {
    return null;
  }
  if (width.unit === "dxa") {
    return `${formatCssNumber(width.value / 20)}pt`;
  }
  if (width.unit === "pct") {
    return `${formatCssNumber(width.value / 50)}%`;
  }
  return `${formatCssNumber(width.value)}px`;
}

/**
 * Normalizes a Word color token for CSS output.
 *
 * @param color - Imported color token.
 * @returns CSS color, or null when the token is not portable.
 */
export function wordTableColorToCss(color: string | null): string | null {
  if (!color) {
    return null;
  }
  const normalized = color.trim();

  if (/^[\da-f]{6}$/i.test(normalized)) {
    return `#${normalized}`;
  }
  if (/^#[\da-f]{3,8}$/i.test(normalized)) {
    return normalized;
  }
  return /^[a-z][\w-]*$/i.test(normalized) ? normalized : null;
}

/**
 * Maps Word vertical alignment to its CSS equivalent.
 *
 * @param alignment - Word cell alignment.
 * @returns CSS vertical-align value, or null when absent.
 */
export function wordTableVerticalAlignToCss(
  alignment: WordTableVerticalAlignment | null
): string | null {
  if (alignment === "center") {
    return "middle";
  }
  return alignment;
}

/**
 * Creates a one-property inline style attribute when the value is available.
 *
 * @param property - CSS property name.
 * @param value - CSS value, or null to omit the property.
 * @returns Rendered HTML attribute map.
 */
export function wordTableStyleAttribute(
  property: string,
  value: string | null
): Record<string, unknown> {
  return value === null ? {} : { style: `${property}: ${value}` };
}

/**
 * Formats finite CSS numbers without unnecessary decimal zeroes.
 *
 * @param value - Numeric CSS component.
 * @returns Stable decimal representation.
 */
function formatCssNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
}
