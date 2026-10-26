import type { DrawingPayload } from "@quirekit/drawing-geometry";
import type { QuireWidgetInsets } from "@quirekit/renderer";
import { resolveQuireDrawingControlPoints, usesQuireDrawingEndpoints } from "./resolve";
import { resolveQuireDrawingSelectionOutlineOffset } from "./frame";
import { resolveQuireDrawingLineHitRadius } from "../hit-targets/line";

/**
 * Reserves rotated frame handles and outlying shape adjustment controls.
 *
 * @param overflow - Drawing paint overflow after rotation.
 * @param radius - Physical outline and handle radius.
 * @param rotation - Optional clockwise interaction rotation.
 * @param drawing - Source geometry carrying any outlying adjustment handles.
 * @returns Complete selected-only physical overflow.
 */
export function resolveQuireDrawingControlOverflow(
  overflow: QuireWidgetInsets | undefined,
  radius: number,
  rotation: number | undefined,
  drawing: DrawingPayload
): QuireWidgetInsets {
  const radians = (rotation ?? 0) * Math.PI / 180;
  const lineRadius = usesQuireDrawingEndpoints(drawing) ? resolveQuireDrawingLineHitRadius(drawing) * Math.SQRT2 : 0;
  const transformedRadius = Math.max(radius, lineRadius, resolveQuireDrawingSelectionOutlineOffset(drawing) + 0.5) * (
    Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians))
  );
  const controls = resolveQuireDrawingControlPoints(drawing);
  const { width, height } = drawing.extent;
  const points = controls.map(({ position }) => {
    const x = position.x - width / 2, y = position.y - height / 2;
    return { x: width / 2 + x * Math.cos(radians) - y * Math.sin(radians),
      y: height / 2 + x * Math.sin(radians) + y * Math.cos(radians) };
  });
  return {
    top: Math.max(overflow?.top ?? 0, ...points.map(point => -point.y)) + transformedRadius,
    right: Math.max(overflow?.right ?? 0, ...points.map(point => point.x - width)) + transformedRadius,
    bottom: Math.max(overflow?.bottom ?? 0, ...points.map(point => point.y - height)) + transformedRadius,
    left: Math.max(overflow?.left ?? 0, ...points.map(point => -point.x)) + transformedRadius
  };
}
