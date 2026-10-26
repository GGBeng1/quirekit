/**
 * Transfers one bounded amount from donor tracks to deficient tracks.
 *
 * @param widths - Mutable working widths.
 * @param deficits - Positive receiver weights.
 * @param donorSlack - Positive donor weights.
 * @param transfer - Total width to move.
 * @param totalDeficit - Sum of receiver weights.
 * @param totalSlack - Sum of donor weights.
 */
export function transferTrackWidths(
  widths: number[],
  deficits: readonly number[],
  donorSlack: readonly number[],
  transfer: number,
  totalDeficit: number,
  totalSlack: number
): void {
  if (transfer <= 0 || totalDeficit <= 0 || totalSlack <= 0) {
    return;
  }

  // Proportional movement prevents stable source order from starving peers.
  const growthScale = transfer / totalDeficit;
  const shrinkScale = transfer / totalSlack;
  for (let index = 0; index < widths.length; index += 1) {
    widths[index] = (widths[index] ?? 1)
      + (deficits[index] ?? 0) * growthScale
      - (donorSlack[index] ?? 0) * shrinkScale;
  }
}

/**
 * Normalizes one intrinsic width to a positive finite CSS-pixel value.
 *
 * @param width - Width supplied by shaping and effective insets.
 * @returns Positive finite width accepted by the track solver.
 */
export function normalizeIntrinsicWidth(width: number): number {
  return Number.isFinite(width) && width > 0 ? width : 1;
}

/**
 * Sums a width vector.
 *
 * @param widths - Widths to add.
 * @returns Numeric total.
 */
export function sumWidths(widths: readonly number[]): number {
  return widths.reduce((total, width) => total + width, 0);
}

/**
 * Assigns floating-point residual to the last track without changing ordering.
 *
 * @param widths - Rebalanced widths.
 * @param expectedTotal - Authoritative total width.
 * @returns Widths whose sum matches the authoritative total.
 */
export function reconcileWidthResidual(
  widths: readonly number[],
  expectedTotal: number
): readonly number[] {
  if (widths.length === 0) {
    return widths;
  }

  const resolved = [...widths];
  const lastIndex = resolved.length - 1;
  resolved[lastIndex] = Math.max(
    1,
    (resolved[lastIndex] ?? 1) + expectedTotal - sumWidths(resolved)
  );
  return resolved;
}
