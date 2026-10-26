import type { DrawingPayload, DrawingShapeSegment } from "@quirekit/drawing-geometry";
import type { QuirePathCommand, QuirePoint, QuireRect } from "@quirekit/renderer";
import { createWordDrawingBoxStyle } from "../../layout/engine/inline/source-capability/drawing/appearance";
import { resolveWordDrawingGeometry } from "./resolve";
import { resolveDrawingPathFill } from "./fill";

/**
 * Resolves geometry, scales each path, then applies the drawing transform once.
 * @param drawing - Canonical drawing payload.
 * @param rect - Accepted or transient drawing frame in paint coordinates.
 * @param id - Retained product identity prefix.
 * @returns Portable paths with conservative transformed paint bounds.
 */
export function createQuireWordShapePaintCommands(drawing: DrawingPayload, rect: QuireRect, id: string): readonly QuirePathCommand[] {
  const { paths } = resolveWordDrawingGeometry(drawing, rect.width, rect.height);
  return paths.map((path, index) => {
    const style = createWordDrawingBoxStyle({ ...drawing.appearance, fill: {
      ...drawing.appearance.fill, color: resolveDrawingPathFill(drawing.appearance.fill.color, path.fillMode)
    } });
    const stroke = style.stroke;
    const points: QuirePoint[] = [];
    // Path coordinates belong to the producer; frame coordinates belong to layout.
    // Reflection precedes center rotation, matching the persisted DrawingML transform.
    /** @param point - Path-local point. @returns Final paint coordinate. */
    const project = (point: QuirePoint): QuirePoint => {
      let x = point.x * rect.width / path.width - rect.width / 2;
      let y = point.y * rect.height / path.height - rect.height / 2;
      if (drawing.transform.flipHorizontal) x = -x;
      if (drawing.transform.flipVertical) y = -y;
      const angle = drawing.transform.rotation * Math.PI / 180;
      const result = { x: rect.x + rect.width / 2 + x * Math.cos(angle) - y * Math.sin(angle),
        y: rect.y + rect.height / 2 + x * Math.sin(angle) + y * Math.cos(angle) };
      points.push(result);
      return result;
    };
    const segments = path.segments.map(segment => transformSegment(segment, project));
    const expansion = path.stroke ? (stroke?.width ?? 0) / 2 : 0;
    const xs = points.map(point => point.x), ys = points.map(point => point.y);
    const left = Math.min(...xs) - expansion, top = Math.min(...ys) - expansion;
    return { id: `${id}:path:${index}`, kind: "path", segments,
      rect: { x: left, y: top, width: Math.max(...xs) + expansion - left, height: Math.max(...ys) + expansion - top },
      ...(path.fill && drawing.appearance.fill.kind !== "none" && style.fill !== undefined ? { fillStyle: style.fill } : {}),
      ...(path.stroke && drawing.appearance.stroke.kind !== "none" && stroke ? {
        strokeStyle: stroke.color, lineWidth: stroke.width ?? 1,
        ...(stroke.lineDash === undefined ? {} : { lineDash: stroke.lineDash })
      } : {})
    };
  });
}

/**
 * Advertises path and stroke overflow so retained paint is never clipped to the frame.
 * @param drawing - Canonical source drawing.
 * @returns Physical overflow around its untransformed local frame.
 */
export function resolveQuireWordShapeVisualOverflow(drawing: DrawingPayload): Readonly<{ top: number; right: number; bottom: number; left: number }> {
  const { width, height } = drawing.extent;
  const commands = createQuireWordShapePaintCommands(drawing, { x: 0, y: 0, width, height }, "bounds");
  return {
    left: Math.max(0, ...commands.map(command => -command.rect.x)),
    top: Math.max(0, ...commands.map(command => -command.rect.y)),
    right: Math.max(0, ...commands.map(command => command.rect.x + command.rect.width - width)),
    bottom: Math.max(0, ...commands.map(command => command.rect.y + command.rect.height - height))
  };
}

/** @param segment - Numeric source operation. @param project - Coordinate projection. @returns Transformed operation. */
function transformSegment(segment: DrawingShapeSegment, project: (point: QuirePoint) => QuirePoint): DrawingShapeSegment {
  if (segment.kind === "close-path") return segment;
  if (segment.kind === "bezier-curve-to") return { ...segment, point: project(segment.point), control1: project(segment.control1), control2: project(segment.control2) };
  if (segment.kind === "quadratic-curve-to") return { ...segment, point: project(segment.point), control: project(segment.control) };
  return { ...segment, point: project(segment.point) };
}
