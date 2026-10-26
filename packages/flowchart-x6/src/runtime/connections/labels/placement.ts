import type { RouteBox } from "../routes/types";
import type { LabelObstacles, LabelPlacement } from "./types";

/** @param box - World bounds. @returns Bounded bucket keys; huge bounds use the overflow list. */
function keys(box: RouteBox): string[] | null {
  const left = Math.floor(box.x / 128), top = Math.floor(box.y / 128), right = Math.floor((box.x + box.width) / 128), bottom = Math.floor((box.y + box.height) / 128);
  if ((right - left + 1) * (bottom - top + 1) > 64) return null;
  const result: string[] = [];
  for (let x = left; x <= right; x++) for (let y = top; y <= bottom; y++) result.push(`${x},${y}`);
  return result;
}
/** @param boxes - Fixed node/label bounds. @returns Command-local index, released after one explicit arrangement. */
export function createLabelObstacles(boxes: readonly RouteBox[]): LabelObstacles {
  const buckets = new Map<string, RouteBox[]>(), large: RouteBox[] = [], all: RouteBox[] = [];
  const result: LabelObstacles = {
    /** @param box - New fixed or placed label. */
    add(box) {
      all.push(box); const cells = keys(box);
      if (!cells) { large.push(box); return; }
      for (const key of cells) { const bucket = buckets.get(key) ?? []; bucket.push(box); buckets.set(key, bucket); }
    },
    /** @param box - Candidate paint bounds. @returns Collision area independent of insertion into multiple buckets. */
    overlap(box) {
      const cells = keys(box), candidates = !cells ? all : new Set([...large, ...cells.flatMap(key => buckets.get(key) ?? [])]);
      let area = 0;
      for (const other of candidates) area += Math.max(0, Math.min(box.x + box.width, other.x + other.width) - Math.max(box.x, other.x))
        * Math.max(0, Math.min(box.y + box.height, other.y + other.height) - Math.max(box.y, other.y));
      return area;
    },
  };
  boxes.forEach(box => result.add(box)); return result;
}
/** @param candidates - Existing placement first, then at most 30 alternatives. @param obstacles - Current world occupancy. @returns Stable minimum collision candidate, preserving current placement on ties. */
export function chooseLabelPlacement(candidates: readonly LabelPlacement[], obstacles: LabelObstacles): LabelPlacement {
  let best = candidates[0]!; if (!best) throw new RangeError("标签没有可用位置");
  let cost = obstacles.overlap(best.box);
  for (const candidate of candidates.slice(1)) {
    if (!cost) break;
    const score = obstacles.overlap(candidate.box);
    if (score < cost) { best = candidate; cost = score; }
  }
  return best;
}
