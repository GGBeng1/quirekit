import type { EdgeView } from "@antv/x6";
import type { FlowchartMotionTiming } from "@quirekit/flowchart";
import type { FlowRuntime } from "../../runtime/types";
import type { MotionPoint } from "./types";

/** @param effect - Checked local timing. @param progress - Current step position. @param duration - Step length. @returns Clamped, eased cue position. */
export function motionProgress(effect: FlowchartMotionTiming, progress: number, duration: number): number {
  const value = Math.max(0, Math.min(1, (progress * duration - (effect.delay ?? 0)) / (effect.duration ?? duration)));
  return effect.easing === "ease-in-out" ? value * value * (3 - 2 * value) : value;
}
/** @param runtime - Owner of the current world-space connector. @param id - Exact edge identity. @param layer - Temporary measuring mount. @returns Cached arc-length points, read once per cue compilation. */
export function motionPath(runtime: FlowRuntime, id: string, layer: SVGGElement): readonly MotionPoint[] {
  const cell = runtime.graph.getCellById(id), view = cell && runtime.graph.findViewByCell(cell);
  if (!cell?.isEdge() || !view) return [];
  const path = runtime.mount.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", (view as EdgeView).getConnectionPathData()); path.setAttribute("visibility", "hidden"); layer.append(path);
  try {
    const length = path.getTotalLength();
    if (!Number.isFinite(length) || length <= 0) return [];
    return Array.from({ length: 129 }, (_, i) => { const point = path.getPointAtLength(length * i / 128); return { x: point.x, y: point.y }; });
  } finally { path.remove(); }
}
/** @param points - Cached equal arc-length samples. @param progress - Travel position. @returns Interpolated world coordinates without graph or SVG geometry reads. */
export function motionPoint(points: readonly MotionPoint[], progress: number): MotionPoint {
  const value = Math.max(0, Math.min(1, progress)) * (points.length - 1), index = Math.min(Math.floor(value), points.length - 2), t = value - index;
  const a = points[index]!, b = points[index + 1]!; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
