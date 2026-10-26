import type { DrawingExtent, DrawingResizePolicy } from "@quirekit/drawing-geometry";

/**
 * Constrains pointer-derived sizes before both preview and final commit.
 * @param requested - Minimum-clamped, optionally proportionate extent.
 * @param minimum - Active lower limits.
 * @param policy - Owner maximums and optional input grid.
 * @param proportional - Whether both dimensions must share the same scale.
 * @param horizontal - Whether the gesture owns a horizontal edge.
 * @returns Bounded extent on the requested grid; no source model is rewritten.
 */
export function constrainResizeExtent(requested: DrawingExtent, minimum: DrawingExtent,
  policy: DrawingResizePolicy, proportional: boolean, horizontal: boolean): DrawingExtent {
  const maximum = policy.maximumExtent ?? { width: Infinity, height: Infinity };
  const scale = proportional ? Math.min(1, maximum.width / requested.width, maximum.height / requested.height) : 1;
  const step = policy.extentStep;
  /** @param value - Pointer-derived dimension. @param min - Lower limit. @param max - Upper limit. @returns Admitted input dimension. */
  function dimension(value: number, min: number, max: number): number {
    const bounded = Math.max(min, Math.min(max, value));
    return step === undefined ? bounded
      : Math.max(Math.ceil(min / step) * step, Math.min(Math.floor(max / step) * step, Math.round(bounded / step) * step));
  }
  const extent = { width: dimension(requested.width * scale, minimum.width, maximum.width),
    height: dimension(requested.height * scale, minimum.height, maximum.height) };
  const snap = policy.widthSnap;
  // Bounds and the owner's grid remain authoritative. Attraction never changes
  // a vertical-only gesture or persists after the pointer leaves this band.
  if (!horizontal || snap === undefined || !Number.isFinite(snap.targetWidth)
    || !Number.isFinite(snap.tolerance) || snap.tolerance < 0
    || snap.targetWidth !== dimension(snap.targetWidth, minimum.width, maximum.width)
    || Math.abs(extent.width - snap.targetWidth) > snap.tolerance) return extent;
  const height = proportional ? snap.targetWidth * requested.height / requested.width : extent.height;
  if (height < minimum.height || height > maximum.height) return extent;
  return { width: snap.targetWidth, height: dimension(height, minimum.height, maximum.height) };
}
