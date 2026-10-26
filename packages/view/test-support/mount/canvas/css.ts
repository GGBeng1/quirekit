/**
 * Parses a CSS pixel string assigned by mounted view sizing.
 *
 * @param value - CSS value to parse.
 * @returns Numeric pixel value when available.
 */
export function parseCssPixelValue(value: string | undefined): number | undefined {
  if (!value?.endsWith("px")) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}
