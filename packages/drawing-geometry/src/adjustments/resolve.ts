import { presetDefinitions } from "../presets/definitions";
import type { DrawingPresetName, PresetAdjustmentAxis } from "../presets/types";
import { evaluateDrawingGuides } from "../evaluation/guides";
import { resolveGeometryValue } from "../evaluation/formulas";
import type { DrawingAdjustmentAxis, DrawingAdjustmentHandle } from "./types";

/**
 * Resolves every declared handle using the same guides as the painted paths.
 * @param preset - Standard geometry identity.
 * @param width - Local width, allowing one zero axis for line presets.
 * @param height - Local height, allowing one zero axis for line presets.
 * @param adjustments - Explicit source values, or standard defaults.
 * @returns Ordered immutable local handle descriptors.
 */
export function resolveDrawingAdjustmentHandles(preset: DrawingPresetName, width: number, height: number,
  adjustments: Readonly<Record<string, number>> = {}): readonly DrawingAdjustmentHandle[] {
  const values = evaluateDrawingGuides(preset, width, height, adjustments);
  return presetDefinitions[preset].handles.map((handle, index) => ({
    index, kind: handle.kind,
    // Handles use frame coordinates, so collapse the evaluator's unit axis just
    // as paint projection does for the corresponding line path.
    position: { x: width === 0 ? 0 : resolveGeometryValue(handle.position[0], values),
      y: height === 0 ? 0 : resolveGeometryValue(handle.position[1], values) },
    ...(handle.x ? { x: resolveAxis(handle.x, values) } : {}),
    ...(handle.y ? { y: resolveAxis(handle.y, values) } : {}),
    ...(handle.radius ? { radius: resolveAxis(handle.radius, values) } : {}),
    ...(handle.angle ? { angle: resolveAxis(handle.angle, values) } : {})
  }));
}

/** @param axis - Formula-valued axis. @param values - Current guide environment. @returns Legal numeric axis. */
function resolveAxis(axis: PresetAdjustmentAxis, values: ReadonlyMap<string, number>): DrawingAdjustmentAxis {
  const min = resolveGeometryValue(axis.min, values), max = resolveGeometryValue(axis.max, values);
  return { guide: axis.guide, value: values.get(axis.guide) ?? 0,
    min: Math.max(-2147483648, Math.min(min, max)), max: Math.min(2147483647, Math.max(min, max)) };
}
