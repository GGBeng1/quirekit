import type { DrawingPayload } from "@quirekit/drawing-geometry";
import { isLineDrawingPreset, resolveDrawingAdjustmentHandles } from "@quirekit/drawing-geometry";
import type { QuirePoint } from "@quirekit/renderer";
import type { QuireDrawingControlPoint } from "./types";

/** @param drawing - Canonical drawing. @returns Whether it uses endpoint controls instead of a frame. */
export function usesQuireDrawingEndpoints(drawing: DrawingPayload): boolean {
  const preset = drawing.geometry?.kind === "preset" ? drawing.geometry.preset : undefined;
  return drawing.kind === "line" || (preset !== undefined && isLineDrawingPreset(preset));
}

/**
 * Derives control points from geometry capabilities, never from toolbar categories.
 * @param drawing - Canonical drawing including extent and reflection.
 * @returns Ordered endpoint and adjustment points in reflected local coordinates.
 */
export function resolveQuireDrawingControlPoints(drawing: DrawingPayload): readonly QuireDrawingControlPoint[] {
  const points: QuireDrawingControlPoint[] = [];
  const { width, height } = drawing.extent;
  const geometry = drawing.geometry;
  if (usesQuireDrawingEndpoints(drawing)) {
    const inverse = geometry?.kind === "preset" && geometry.preset === "lineInv";
    points.push(
      { reference: { kind: "endpoint", end: "start" }, position: { x: 0, y: inverse ? height : 0 } },
      { reference: { kind: "endpoint", end: "end" }, position: { x: width, y: inverse ? 0 : height } }
    );
  }
  if (geometry?.kind === "preset") {
    const adjustments = geometry.adjustment === undefined ? geometry.adjustments : { adj: geometry.adjustment };
    for (const handle of resolveDrawingAdjustmentHandles(geometry.preset, width, height, adjustments)) {
      points.push({ reference: { kind: "adjustment", index: handle.index }, position: handle.position });
    }
  }
  return points.map(point => ({ ...point, position: reflectQuireDrawingPoint(point.position, drawing) }));
}

/** @param point - Local point. @param drawing - Extent and reflection authority. @returns Reflected local point. */
export function reflectQuireDrawingPoint(point: QuirePoint, drawing: DrawingPayload): QuirePoint {
  return { x: drawing.transform.flipHorizontal ? drawing.extent.width - point.x : point.x,
    y: drawing.transform.flipVertical ? drawing.extent.height - point.y : point.y };
}
