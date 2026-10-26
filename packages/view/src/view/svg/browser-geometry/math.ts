/**
 * Clamps a number into an inclusive range for SVG browser geometry reads.
 *
 * @param value - Number to clamp.
 * @param min - Inclusive minimum.
 * @param max - Inclusive maximum.
 * @returns Clamped number.
 */
export function clampSvgBrowserGeometryNumber(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(max, Math.max(min, value));
}
