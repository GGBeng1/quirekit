import type { DrawingGeometryPoint, DrawingGeometrySegment } from "./types";
import { drawingAngleUnit } from "./formulas";

/**
 * Converts a DrawingML polar-angle arc into bounded cubic ellipse segments.
 * @param current - Start point in the path's own coordinate system.
 * @param radiusX - Horizontal radius.
 * @param radiusY - Vertical radius.
 * @param start - DrawingML start angle.
 * @param sweep - Signed DrawingML sweep angle.
 * @returns Cubic segments in that same path coordinate system.
 */
export function resolveDrawingArc(current: DrawingGeometryPoint, radiusX: number, radiusY: number, start: number, sweep: number): DrawingGeometrySegment[] {
  if (radiusX <= 0 || radiusY <= 0 || sweep === 0) return [];
  const fullTurn = Math.PI * 2;
  const startAngle = start * drawingAngleUnit;
  const sweepAngle = Math.max(-fullTurn, Math.min(fullTurn, sweep * drawingAngleUnit));
  // DrawingML angles are geometric rays, not ellipse parameters. Conversion must
  // precede segmentation; otherwise non-square circles have incorrect endpoints.
  /** @param angle - Geometric ray angle. @returns Ellipse parameter angle. */
  const parameter = (angle: number): number => Math.atan2(radiusX * Math.sin(angle), radiusY * Math.cos(angle));
  const first = parameter(startAngle);
  let span = parameter(startAngle + sweepAngle) - first;
  if (Math.abs(sweepAngle) >= fullTurn - 1e-10) span = Math.sign(sweepAngle) * fullTurn;
  else if (sweepAngle > 0 && span < 0) span += fullTurn;
  else if (sweepAngle < 0 && span > 0) span -= fullTurn;
  const center = { x: current.x - radiusX * Math.cos(first), y: current.y - radiusY * Math.sin(first) };
  const count = Math.max(1, Math.ceil(Math.abs(span) / (Math.PI / 2)));
  const step = span / count;
  const segments: DrawingGeometrySegment[] = [];
  /** @param angle - Ellipse parameter. @returns Point in local path coordinates. */
  const point = (angle: number): DrawingGeometryPoint => ({
    x: center.x + radiusX * Math.cos(angle), y: center.y + radiusY * Math.sin(angle)
  });
  for (let index = 0; index < count; index++) {
    const a = first + step * index, b = a + step;
    const p = point(a), q = point(b), coefficient = 4 / 3 * Math.tan(step / 4);
    segments.push({
      kind: "bezier-curve-to",
      control1: { x: p.x - coefficient * radiusX * Math.sin(a), y: p.y + coefficient * radiusY * Math.cos(a) },
      control2: { x: q.x + coefficient * radiusX * Math.sin(b), y: q.y - coefficient * radiusY * Math.cos(b) },
      point: q
    });
  }
  return segments;
}
