/** Normalizes the configured item count.
 * @param count - Consumer-provided maximum score.
 * @returns A finite positive integer.
 */
export function ratingCount(count: number): number {
  return Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 5;
}

/** Projects external and Ark values into the public zero-based score contract.
 * @param value - Requested score, including Ark's negative empty sentinel.
 * @param count - Normalized maximum score.
 * @param allowHalf - Whether fractional steps are enabled.
 * @returns A bounded integer or half-integer score.
 */
export function ratingValue(value: number, count: number, allowHalf: boolean): number {
  const factor = allowHalf ? 2 : 1;
  return Number.isFinite(value) ? Math.max(0, Math.min(count, Math.round(value * factor) / factor)) : 0;
}
