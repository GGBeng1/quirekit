import { doesQuireRectIntersectAny, type QuireRect } from "@quirekit/renderer";

/**
 * Applies the shared snapshot and display-list realization boundary.
 * @param rect - Document-space layout or paint rectangle.
 * @param clips - Active clips; undefined means an unbounded realization.
 * @returns Whether the rectangle belongs to the requested realization.
 */
export function doesQuireRectIntersectClip(
  rect: QuireRect,
  clips: readonly QuireRect[] | undefined
): boolean {
  return clips === undefined || doesQuireRectIntersectAny(rect, clips);
}
