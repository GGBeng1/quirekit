import type { DrawingPayload } from "@quirekit/drawing-geometry";
import type { QuirePoint } from "@quirekit/renderer";
import type { QuireDrawingFrame } from "../../interaction/drawing-controller/types";
import { resolveQuireDrawingControlPoints } from "./resolve";

/**
 * Moves one endpoint in the accepted rotation basis while pinning its opposite.
 * @param drawing - Accepted source geometry.
 * @param frame - Accepted document-space frame.
 * @param end - Endpoint being moved.
 * @param delta - Document-space pointer displacement, preserving the grab offset.
 * @param shiftKey - Whether to constrain the endpoint direction to 45 degrees.
 * @returns Canonical positive frame and drawing with updated reflection.
 */
export function moveQuireDrawingEndpoint(drawing: DrawingPayload, frame: QuireDrawingFrame,
  end: "start" | "end", delta: QuirePoint, shiftKey: boolean): { frame: QuireDrawingFrame; drawing: DrawingPayload } {
  const endpoints = resolveQuireDrawingControlPoints(drawing).filter(point => point.reference.kind === "endpoint");
  const start = endpoints[0]!.position, finish = endpoints[1]!.position;
  const moving = end === "start" ? start : finish, fixed = end === "start" ? finish : start;
  const angle = frame.rotation * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
  let current = { x: moving.x + delta.x * cos + delta.y * sin, y: moving.y - delta.x * sin + delta.y * cos };
  if (shiftKey) {
    const dx = current.x - fixed.x, dy = current.y - fixed.y;
    const snapped = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI / 4;
    const length = Math.hypot(dx, dy);
    current = { x: fixed.x + length * Math.cos(snapped), y: fixed.y + length * Math.sin(snapped) };
  }
  const a = end === "start" ? current : fixed, b = end === "start" ? fixed : current;
  // A tiny positive degenerate extent satisfies the source contract without the
  // ordinary 12px minimum forcing a horizontal line into a visibly slanted box.
  const width = Math.max(0.001, Math.abs(b.x - a.x)), height = Math.max(0.001, Math.abs(b.y - a.y));
  const localX = (a.x + b.x) / 2 - frame.rect.width / 2;
  const localY = (a.y + b.y) / 2 - frame.rect.height / 2;
  const centerX = frame.rect.x + frame.rect.width / 2 + localX * cos - localY * sin;
  const centerY = frame.rect.y + frame.rect.height / 2 + localX * sin + localY * cos;
  const inverse = drawing.geometry?.kind === "preset" && drawing.geometry.preset === "lineInv";
  return {
    frame: { rotation: frame.rotation, rect: { x: centerX - width / 2, y: centerY - height / 2, width, height } },
    drawing: { ...drawing, extent: { width, height }, transform: { ...drawing.transform,
      flipHorizontal: a.x > b.x, flipVertical: inverse ? a.y <= b.y : a.y > b.y } }
  };
}
