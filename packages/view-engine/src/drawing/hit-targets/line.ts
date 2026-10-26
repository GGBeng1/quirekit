import type { DrawingPayload, DrawingShapeSegment } from "@quirekit/drawing-geometry";
import { createQuirePolygonHitArea, type QuirePoint, type QuirePolygonHitArea } from "@quirekit/renderer";
import { reflectQuireDrawingPoint, usesQuireDrawingEndpoints } from "../control-points/resolve";
import { resolveWordDrawingGeometry } from "../geometry/resolve";

/** @param drawing - Canonical stroke appearance. @returns Invisible document-space line selection radius. */
export function resolveQuireDrawingLineHitRadius(drawing: DrawingPayload): number {
  return Math.max(7, (drawing.appearance.stroke.kind === "none" ? 0 : drawing.appearance.stroke.width) / 2 + 3);
}

/**
 * Resolves shared selection/move corridors directly from accepted line geometry.
 * @param drawing - Source geometry, reflection and stroke width.
 * @returns Reflected frame-local polygons, or undefined for frame-based objects.
 */
export function resolveQuireDrawingLineHitAreas(drawing: DrawingPayload): readonly QuirePolygonHitArea[] | undefined {
  if (!usesQuireDrawingEndpoints(drawing)) return undefined;
  const { width, height } = drawing.extent;
  const radius = resolveQuireDrawingLineHitRadius(drawing);
  const areas: QuirePolygonHitArea[] = [];
  // Geometry is sampled once per accepted source, before placement/rotation.
  // Pointer queries consume retained polygons and never re-evaluate shape paths.
  for (const path of resolveWordDrawingGeometry(drawing, width, height).paths) {
    let previous: QuirePoint | undefined;
    /** @param point - Producer path coordinate. @returns Reflected frame coordinate. */
    const project = (point: QuirePoint): QuirePoint => reflectQuireDrawingPoint({
      x: point.x * width / path.width, y: point.y * height / path.height
    }, drawing);
    for (const segment of path.segments) {
      if (segment.kind === "close-path") continue;
      if (segment.kind !== "move-to" && previous) {
        let start = project(previous);
        for (const point of sampleSegment(previous, segment)) {
          const end = project(point);
          areas.push(createSegmentArea(start, end, radius));
          start = end;
        }
      }
      previous = segment.point;
    }
  }
  return areas;
}

/** @param start - Segment origin. @param segment - Numeric path operation. @returns At most 24 samples per curve. */
function sampleSegment(start: QuirePoint, segment: Exclude<DrawingShapeSegment, { readonly kind: "close-path" }>): readonly QuirePoint[] {
  if (segment.kind === "move-to" || segment.kind === "line-to") return [segment.point];
  return Array.from({ length: 24 }, (_, index) => {
    const t = (index + 1) / 24, u = 1 - t;
    if (segment.kind === "quadratic-curve-to") return {
      x: u * u * start.x + 2 * u * t * segment.control.x + t * t * segment.point.x,
      y: u * u * start.y + 2 * u * t * segment.control.y + t * t * segment.point.y
    };
    if (segment.kind !== "bezier-curve-to") return segment.point;
    return { x: u ** 3 * start.x + 3 * u * u * t * segment.control1.x + 3 * u * t * t * segment.control2.x + t ** 3 * segment.point.x,
      y: u ** 3 * start.y + 3 * u * u * t * segment.control1.y + 3 * u * t * t * segment.control2.y + t ** 3 * segment.point.y };
  });
}

/** @param a - First frame-local point. @param b - Last frame-local point. @param radius - Invisible selection margin. @returns Segment corridor including its ends. */
function createSegmentArea(a: QuirePoint, b: QuirePoint, radius: number): QuirePolygonHitArea {
  const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
  const tx = length > 0.001 ? dx * radius / length : radius;
  const ty = length > 0.001 ? dy * radius / length : 0;
  return createQuirePolygonHitArea([
    { x: a.x - tx - ty, y: a.y - ty + tx }, { x: b.x + tx - ty, y: b.y + ty + tx },
    { x: b.x + tx + ty, y: b.y + ty - tx }, { x: a.x - tx + ty, y: a.y - ty - tx }
  ]);
}
