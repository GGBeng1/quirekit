/**
 * Clamps a number to a closed range.
 *
 * @param value - Number to clamp.
 * @param min - Minimum allowed value.
 * @param max - Maximum allowed value.
 * @returns Clamped number.
 */
export function minMax(value = 0, min = 0, max = 0): number {
  return Math.min(Math.max(value, min), max);
}
