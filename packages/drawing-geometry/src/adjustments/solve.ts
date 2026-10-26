import type { DrawingGeometryPoint } from "../evaluation/types";
import { resolveDrawingAdjustmentHandles } from "./resolve";
import type { DrawingAdjustmentHandle, DrawingAdjustmentRequest } from "./types";

const axes = ["x", "y", "radius", "angle"] as const;
const fullTurn = Math.PI * 2;

/**
 * Inverts one standard handle with bounded, local finite-difference steps.
 * @param request - Accepted source geometry and desired untransformed handle point.
 * @returns Source adjustment map changing only guides referenced by this handle.
 */
export function solveDrawingAdjustment(request: DrawingAdjustmentRequest): Readonly<Record<string, number>> {
  const result = { ...request.adjustments };
  if (!Number.isFinite(request.point.x) || !Number.isFinite(request.point.y)) return result;
  /** @param candidate - Candidate explicit values. @returns Selected evaluated handle. */
  const resolve = (candidate: Readonly<Record<string, number>>): DrawingAdjustmentHandle | undefined =>
    resolveDrawingAdjustmentHandles(request.preset, request.width, request.height, candidate)[request.handle];
  if (!resolve(result)) return result;

  // Work is bounded by this preset's guides and two referenced axes. Reevaluate
  // dependent bounds each step; never iterate over document nodes or the catalog.
  for (let iteration = 0; iteration < 16; iteration += 1) {
    let changed = false;
    for (const key of axes) {
      const handle = resolve(result)!;
      const axis = handle[key];
      if (!axis || axis.max <= axis.min) continue;
      const value = Math.max(axis.min, Math.min(axis.max, axis.value));
      const step = Math.max(1, Math.abs(value) * 0.0001);
      const low = Math.max(axis.min, value - step), high = Math.min(axis.max, value + step);
      const before = resolve({ ...result, [axis.guide]: low })!;
      const after = resolve({ ...result, [axis.guide]: high })!;
      const gradient = difference(measure(after.position, key, request), measure(before.position, key, request), key) / (high - low);
      const error = difference(measure(request.point, key, request), measure(handle.position, key, request), key);
      if (!Number.isFinite(gradient) || Math.abs(gradient) < 1e-12 || Math.abs(error) < 1e-8) continue;
      const candidate = value + error / gradient;
      const wrapped = key === "angle" && axis.max - axis.min >= 21599999
        ? ((candidate % 21600000) + 21600000) % 21600000 : candidate;
      const next = Math.max(axis.min, Math.min(axis.max, wrapped));
      if (!Number.isFinite(next)) continue;
      result[axis.guide] = next;
      changed ||= Math.abs(next - value) > 1e-6;
    }
    if (!changed) break;
  }
  // Authored guide constants use the integer DrawingML value space. Preserve
  // untouched source entries; quantize only values changed by this gesture.
  for (const axis of axes) {
    const bounds = resolve(result)?.[axis];
    if (bounds && result[bounds.guide] !== undefined && result[bounds.guide] !== request.adjustments[bounds.guide]) {
      result[bounds.guide] = Math.max(Math.ceil(bounds.min), Math.min(Math.floor(bounds.max), Math.round(result[bounds.guide]!)));
    }
  }
  return result;
}

/** @param point - Local point. @param axis - Declared axis. @param request - Local frame. @returns Axis coordinate. */
function measure(point: DrawingGeometryPoint, axis: typeof axes[number], request: DrawingAdjustmentRequest): number {
  if (axis === "x" || axis === "y") return point[axis];
  const x = point.x - request.width / 2, y = point.y - request.height / 2;
  return axis === "radius" ? Math.hypot(x, y) : Math.atan2(y, x);
}

/** @param a - Desired coordinate. @param b - Current coordinate. @param axis - Coordinate family. @returns Signed shortest residual. */
function difference(a: number, b: number, axis: typeof axes[number]): number {
  const delta = a - b;
  return axis === "angle" ? ((delta + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI : delta;
}
