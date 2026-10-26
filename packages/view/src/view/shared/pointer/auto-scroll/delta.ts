const pointerAutoScrollMaximumStep = 24;
const pointerAutoScrollMinimumStep = 2;

/**
 * Resolves one frame's signed scroll step for a client-space axis.
 *
 * @param coordinate - Pointer coordinate on the axis.
 * @param start - Visible scrollport start on the axis.
 * @param length - Visible scrollport length on the axis.
 * @param leadingThreshold - Distance from the leading edge that activates scrolling.
 * @param trailingThreshold - Distance from the trailing edge that activates scrolling.
 * @returns Signed CSS-pixel scroll step, or zero outside the edge bands.
 */
export function resolveMountedPointerAutoScrollAxisDelta(
  coordinate: number,
  start: number,
  length: number,
  leadingThreshold: number,
  trailingThreshold: number
): number {
  if (length <= 0) {
    return 0;
  }

  const end = start + length;
  const leadingBand = Math.max(0, Math.min(leadingThreshold, length / 2));
  const trailingBand = Math.max(0, Math.min(trailingThreshold, length / 2));
  const leadingDistance = coordinate - start;
  const trailingDistance = end - coordinate;

  if (leadingBand > 0 && leadingDistance < leadingBand) {
    const pressure = Math.min(
      1,
      (leadingBand - leadingDistance) / leadingBand
    );
    return -Math.max(
      pointerAutoScrollMinimumStep,
      Math.round(pointerAutoScrollMaximumStep * pressure)
    );
  }

  if (trailingBand > 0 && trailingDistance < trailingBand) {
    const pressure = Math.min(
      1,
      (trailingBand - trailingDistance) / trailingBand
    );
    return Math.max(
      pointerAutoScrollMinimumStep,
      Math.round(pointerAutoScrollMaximumStep * pressure)
    );
  }

  return 0;
}
