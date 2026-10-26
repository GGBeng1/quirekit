import type { DrawingPayload } from "@quirekit/drawing-geometry";
import { solveDrawingAdjustment } from "@quirekit/drawing-geometry";
import type { QuirePoint } from "@quirekit/renderer";
import type { QuireDrawingFrame, QuireDrawingTransientTrack } from "../../interaction/drawing-controller/types";
import type { QuireDrawingControlReference } from "./types";
import { moveQuireDrawingEndpoint } from "./endpoint";
import { reflectQuireDrawingPoint, resolveQuireDrawingControlPoints } from "./resolve";

/**
 * Produces source-shaped preview data without dispatching a document mutation.
 * @param drawing - Immutable source captured at pointer down.
 * @param reference - Semantic control identity.
 * @param frame - Accepted document frame.
 * @param start - Captured pointer point in document coordinates.
 * @param current - Current pointer point in document coordinates.
 * @param shiftKey - Current direction constraint.
 * @returns One preview track including the adjusted drawing payload.
 */
export function createQuireDrawingControlTrack(drawing: DrawingPayload, reference: QuireDrawingControlReference,
  frame: QuireDrawingFrame, start: QuirePoint, current: QuirePoint, shiftKey: boolean): QuireDrawingTransientTrack {
  const delta = { x: current.x - start.x, y: current.y - start.y };
  let previewFrame = frame, previewDrawing = drawing;
  if (reference.kind === "endpoint") {
    const result = moveQuireDrawingEndpoint(drawing, frame, reference.end, delta, shiftKey);
    previewFrame = result.frame;
    previewDrawing = result.drawing;
  } else if (drawing.geometry?.kind === "preset") {
    const control = resolveQuireDrawingControlPoints(drawing).find(point =>
      point.reference.kind === "adjustment" && point.reference.index === reference.index);
    if (control) {
      // Undo center rotation, then reflection. Start from the exact handle point,
      // not the hit-box click, so grabbing near a small marker never jumps.
      const angle = frame.rotation * Math.PI / 180;
      const point = reflectQuireDrawingPoint({
        x: control.position.x + delta.x * Math.cos(angle) + delta.y * Math.sin(angle),
        y: control.position.y - delta.x * Math.sin(angle) + delta.y * Math.cos(angle)
      }, drawing);
      const geometry = drawing.geometry;
      const adjustments = solveDrawingAdjustment({ preset: geometry.preset, ...drawing.extent,
        adjustments: geometry.adjustment === undefined ? geometry.adjustments ?? {} : { adj: geometry.adjustment },
        handle: reference.index, point });
      previewDrawing = { ...drawing, geometry: { kind: "preset", preset: geometry.preset, adjustments } };
    }
  }
  return { kind: "control", startFrame: frame, previewFrame, startPoint: start, currentPoint: current, previewDrawing };
}
