import type { QuireScrollBlock } from "@quirekit/core";
import { getMountedViewScrollInsetSide } from "./insets";
import type { MountedViewScrollInset, MountedViewScrollRect } from "./types";

/**
 * Computes the scroll delta one container needs to reveal a rectangle.
 *
 * Horizontally the nearest edge is revealed. Vertically `nearest` scrolls only when
 * the rectangle comes within `threshold` of an edge; `start`, `end` and `center`
 * always align, keeping `margin` from the edge. A rectangle taller than the visible
 * area aligns its top, so its beginning stays readable.
 *
 * @param rect - Rectangle to reveal, in client coordinates.
 * @param bounds - Visible bounds of the container, in client coordinates.
 * @param threshold - Distance from an edge that triggers `nearest` scrolling.
 * @param margin - Space kept between the revealed rectangle and the edge.
 * @param block - Vertical alignment.
 * @returns Horizontal and vertical scroll deltas.
 */
export function resolveMountedViewScrollMove(
  rect: MountedViewScrollRect,
  bounds: MountedViewScrollRect,
  threshold: MountedViewScrollInset,
  margin: MountedViewScrollInset,
  block: QuireScrollBlock = "nearest"
): { readonly x: number; readonly y: number } {
  let x = 0;
  if (rect.left < bounds.left + getMountedViewScrollInsetSide(threshold, "left")) {
    x = -(bounds.left - rect.left + getMountedViewScrollInsetSide(margin, "left"));
  } else if (rect.right > bounds.right - getMountedViewScrollInsetSide(threshold, "right")) {
    x = rect.right - bounds.right + getMountedViewScrollInsetSide(margin, "right");
  }
  return { x, y: resolveVerticalMove(rect, bounds, threshold, margin, block) };
}

/**
 * @param rect - Rectangle to reveal.
 * @param bounds - Visible bounds.
 * @param threshold - `nearest` trigger distance.
 * @param margin - Kept space.
 * @param block - Vertical alignment.
 * @returns Vertical scroll delta.
 */
function resolveVerticalMove(
  rect: MountedViewScrollRect,
  bounds: MountedViewScrollRect,
  threshold: MountedViewScrollInset,
  margin: MountedViewScrollInset,
  block: QuireScrollBlock
): number {
  const top = getMountedViewScrollInsetSide(margin, "top");
  const bottom = getMountedViewScrollInsetSide(margin, "bottom");
  const tall = rect.bottom - rect.top > bounds.bottom - bounds.top - top - bottom;
  if (block === "start" || (block === "center" && tall)) return rect.top - (bounds.top + top);
  if (block === "end") return tall ? rect.top - (bounds.top + top) : rect.bottom - (bounds.bottom - bottom);
  if (block === "center") return (rect.top + rect.bottom) / 2 - (bounds.top + bounds.bottom) / 2;
  return resolveNearestMove(rect.top, rect.bottom, bounds.top, bounds.bottom,
    getMountedViewScrollInsetSide(threshold, "top"), getMountedViewScrollInsetSide(threshold, "bottom"), top, bottom);
}

/**
 * Reveals the nearest vertical edge; a target taller than the visible area aligns its top.
 * @param start - Rectangle start.
 * @param end - Rectangle end.
 * @param boundsStart - Visible start.
 * @param boundsEnd - Visible end.
 * @param thresholdStart - Trigger distance at the start edge.
 * @param thresholdEnd - Trigger distance at the end edge.
 * @param marginStart - Kept space at the start edge.
 * @param marginEnd - Kept space at the end edge.
 * @returns Scroll delta along the axis.
 */
function resolveNearestMove(
  start: number, end: number, boundsStart: number, boundsEnd: number,
  thresholdStart: number, thresholdEnd: number, marginStart: number, marginEnd: number
): number {
  if (start < boundsStart + thresholdStart) return -(boundsStart - start + marginStart);
  if (end > boundsEnd - thresholdEnd) {
    return end - start > boundsEnd - boundsStart ? start + marginStart - boundsStart : end - boundsEnd + marginEnd;
  }
  return 0;
}
