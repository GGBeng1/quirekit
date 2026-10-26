import { presetDefinitions } from "../presets/definitions";
import { isLineDrawingPreset, readDrawingAdjustments } from "../presets/catalog";
import type { DrawingPresetName } from "../presets/types";
import { evaluateGeometryFormula } from "./formulas";

/**
 * Evaluates one local guide environment without constructing paths.
 * @param preset - Standard geometry identity.
 * @param width - Local width, allowing one zero axis for line presets.
 * @param height - Local height, allowing one zero axis for line presets.
 * @param adjustments - Explicit authored guide values.
 * @returns Fresh evaluated guide environment.
 */
export function evaluateDrawingGuides(preset: DrawingPresetName, width: number, height: number,
  adjustments: Readonly<Record<string, number>>): ReadonlyMap<string, number> {
  const definition = presetDefinitions[preset];
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 0 || height < 0
    || (width === 0 && height === 0)
    || ((width === 0 || height === 0) && !isLineDrawingPreset(preset))) throw new RangeError("Invalid drawing extent.");
  // A collapsed line axis still needs a finite local path domain. Paint and hit
  // projection scale this unit domain back into the unchanged zero-axis frame.
  width = width === 0 ? 1 : width;
  height = height === 0 ? 1 : height;
  const explicit = readDrawingAdjustments(preset, adjustments);
  if (!explicit) throw new RangeError("Unsupported drawing adjustments.");
  const values = new Map(Object.entries({
    w: width, h: height, l: 0, t: 0, r: width, b: height,
    hc: width / 2, vc: height / 2, ss: Math.min(width, height), ls: Math.max(width, height)
  }));
  // Default and explicit source values are settled before any derived guide.
  // Keeping this order makes resizing and clipboard copies reproduce the same shape.
  for (const [name, formula] of definition.adjustments) values.set(name, explicit[name] ?? evaluateGeometryFormula(formula, values));
  for (const [name, formula] of definition.guides) values.set(name, evaluateGeometryFormula(formula, values));
  return values;
}
