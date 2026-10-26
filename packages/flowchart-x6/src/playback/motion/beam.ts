import { motionPoint } from "./geometry";
import type { MotionPoint } from "./types";

/** @param points - Cached equal arc-length samples. @returns A bounded 18-world-pixel trail span, computed only at cue compilation. */
export function motionBeamSpan(points: readonly MotionPoint[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y);
  return Math.min(.15, 18 / Math.max(1, length));
}
/** @param points - Cached path authority. @param progress - Head's travel progress. @param span - Precompiled trail length. @param reverse - Reverse travel. @returns Nine local points behind the head, without SVG/graph geometry reads. */
export function motionBeamPath(points: readonly MotionPoint[], progress: number, span: number, reverse: boolean): string {
  const head = motionPoint(points, reverse ? 1 - progress : progress);
  return Array.from({ length: 9 }, (_, i) => {
    const p = Math.max(0, progress - span * (1 - i / 8)), point = motionPoint(points, reverse ? 1 - p : p);
    return `${i ? "L" : "M"}${point.x - head.x},${point.y - head.y}`;
  }).join(" ");
}
