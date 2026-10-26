import { presetDefinitions } from "../presets/definitions";
import { evaluateDrawingGuides } from "./guides";
import type { DrawingPresetName } from "../presets/types";
import { resolveGeometryValue } from "./formulas";
import { resolveGeometryPath } from "./paths";
import type { ResolvedDrawingGeometry } from "./types";

/**
 * Resolves a standard preset at its authored extent, without retaining editor state.
 * @param preset - Standard identity.
 * @param width - Frame width, allowing one zero axis for line presets.
 * @param height - Frame height, allowing one zero axis for line presets.
 * @param adjustments - Explicit constant adjustments; omitted values use the preset.
 * @returns Fresh numeric paths and normalized text rectangle.
 */
export function resolveDrawingPreset(preset: DrawingPresetName, width: number, height: number, adjustments: Readonly<Record<string, number>> = {}): ResolvedDrawingGeometry {
  const definition = presetDefinitions[preset];
  const values = evaluateDrawingGuides(preset, width, height, adjustments);
  const [left, top, right, bottom] = definition.textRect.map(token => resolveGeometryValue(token, values));
  return {
    paths: definition.paths.map(path => resolveGeometryPath(path, values)),
    textRect: { left: left! / values.get("w")!, top: top! / values.get("h")!, right: right! / values.get("w")!, bottom: bottom! / values.get("h")! }
  };
}
