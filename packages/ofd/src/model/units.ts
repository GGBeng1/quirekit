/**
 * Converts typographic points to OFD millimetres.
 *
 * @param points - Typographic points.
 * @returns Equivalent millimetres.
 */
export function ofdMillimetresFromPoints(points: number): number {
  return points * 25.4 / 72;
}

/**
 * Converts inches to OFD millimetres.
 *
 * @param inches - Physical inches.
 * @returns Equivalent millimetres.
 */
export function ofdMillimetresFromInches(inches: number): number {
  return inches * 25.4;
}

/**
 * Converts centimetres to OFD millimetres.
 *
 * @param centimetres - Physical centimetres.
 * @returns Equivalent millimetres.
 */
export function ofdMillimetresFromCentimetres(centimetres: number): number {
  return centimetres * 10;
}

/**
 * Converts OFD millimetres to typographic points.
 *
 * @param millimetres - Physical millimetres.
 * @returns Equivalent typographic points.
 */
export function ofdPointsFromMillimetres(millimetres: number): number {
  return millimetres * 72 / 25.4;
}
