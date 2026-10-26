import type { DrawingPayload } from "@quirekit/drawing-geometry";
import { resolveDrawingPreset } from "@quirekit/drawing-geometry";
import type { ResolvedDrawingGeometry } from "@quirekit/drawing-geometry";

/**
 * Bridges canonical Word geometry to the shared frame-local evaluator.
 * @param drawing - Drawing source, including legacy primitive kinds.
 * @param width - Accepted or provisional width.
 * @param height - Accepted or provisional height.
 * @returns Numeric geometry without Word placement or viewport coordinates.
 */
export function resolveWordDrawingGeometry(drawing: DrawingPayload, width: number, height: number): ResolvedDrawingGeometry {
  const geometry = drawing.geometry;
  if (geometry?.kind === "custom") return {
    paths: geometry.paths.map(path => ({ ...path, fillMode: path.fill ? "norm" : "none" })),
    textRect: geometry.textRect ?? { left: 0, top: 0, right: 1, bottom: 1 }
  };
  const preset = geometry?.preset ?? (drawing.kind === "ellipse" ? "ellipse" : drawing.kind === "line" ? "line" : "rect");
  return resolveDrawingPreset(preset, width, height,
    geometry?.adjustment === undefined ? geometry?.adjustments : { adj: geometry.adjustment });
}
