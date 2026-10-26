import { isQuireRectEmpty, type QuireRect } from "../geometry";
import type { QuirePathSegment } from "@quirekit/render-contract";

/**
 * Creates a clockwise rounded-rectangle path with quadratic corners.
 *
 * Invalid or zero-area rectangles fail closed with no path. Negative and
 * non-finite radii resolve to zero; oversized radii clamp to half the shorter
 * rectangle axis.
 *
 * @param rect - Finite positive-area rectangle bounded by the path.
 * @param requestedRadius - Requested corner radius before normalization.
 * @returns Ordered path segments, or an empty list for invalid rectangles.
 */
export function createQuireRoundedRectPathSegments(
  rect: QuireRect,
  requestedRadius: number
): readonly QuirePathSegment[] {
  if (isQuireRectEmpty(rect)) {
    return [];
  }

  const radius = Number.isFinite(requestedRadius) && requestedRadius > 0
    ? Math.min(requestedRadius, rect.width / 2, rect.height / 2)
    : 0;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;

  return [
    { kind: "move-to", point: { x: rect.x + radius, y: rect.y } },
    { kind: "line-to", point: { x: right - radius, y: rect.y } },
    {
      kind: "quadratic-curve-to",
      control: { x: right, y: rect.y },
      point: { x: right, y: rect.y + radius }
    },
    { kind: "line-to", point: { x: right, y: bottom - radius } },
    {
      kind: "quadratic-curve-to",
      control: { x: right, y: bottom },
      point: { x: right - radius, y: bottom }
    },
    { kind: "line-to", point: { x: rect.x + radius, y: bottom } },
    {
      kind: "quadratic-curve-to",
      control: { x: rect.x, y: bottom },
      point: { x: rect.x, y: bottom - radius }
    },
    { kind: "line-to", point: { x: rect.x, y: rect.y + radius } },
    {
      kind: "quadratic-curve-to",
      control: { x: rect.x, y: rect.y },
      point: { x: rect.x + radius, y: rect.y }
    },
    { kind: "close-path" }
  ];
}
