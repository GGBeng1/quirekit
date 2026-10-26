const TWIPS_PER_INCH = 1440;
const CENTIMETERS_PER_INCH = 2.54;
const STEP_CENTIMETERS = 0.05;

/**
 * Converts Word twips to centimeters.
 *
 * @param twips - Distance in twentieths of a point.
 * @returns Distance in centimeters.
 */
export function twipsToCentimeters(twips: number): number {
  return twips / TWIPS_PER_INCH * CENTIMETERS_PER_INCH;
}

/**
 * Applies one product-facing centimeter step to a twip distance.
 *
 * @param twips - Current distance in twips.
 * @param direction - Decrease (-1) or increase (1).
 * @returns Next non-negative integer twip distance.
 */
export function stepDistanceTwips(twips: number, direction: -1 | 1): number {
  const centimeters = Math.max(0, twipsToCentimeters(twips) + direction * STEP_CENTIMETERS);
  return Math.round(centimeters / CENTIMETERS_PER_INCH * TWIPS_PER_INCH);
}

/**
 * Formats a twip distance for the compact readout.
 *
 * @param twips - Distance in twentieths of a point.
 * @param unit - Localized unit suffix.
 * @returns Two-decimal centimeter label.
 */
export function formatDistance(twips: number, unit: string): string {
  return `${twipsToCentimeters(twips).toFixed(2)} ${unit}`;
}
