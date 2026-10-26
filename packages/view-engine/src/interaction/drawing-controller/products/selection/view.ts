import { createLineMoveTargets } from "./line";
import { qkView, type QuireViewNode } from "@quirekit/renderer";
import type { QuireDrawingSelectedObjectViewOptions } from "../types";
import { selectionColor, createSelectedDrawingNodeId } from "./shared";
import { createTextEntryTarget } from "./text";
import { createMoveBands } from "./move";
import { selectionHandles, createSelectionHandle } from "./resize";
import { createRotationAffordance } from "./rotation";
import { usesQuireDrawingEndpoints, resolveQuireDrawingControlPoints } from "../../../../drawing/control-points";
import { createGeometryControl } from "./control";
import { resolveQuireDrawingSelectionOutlineOffset } from "../../../../drawing/control-points/frame";
/**
 * Creates shared selected-object chrome from accepted drawing geometry.
 *
 * @param width - Accepted drawing width.
 * @param height - Accepted drawing height.
 * @param options - Stable source identity and resize policy.
 * @returns Renderer-neutral controls selected by the drawing capability.
 */
export function createQuireDrawingSelectedObjectView(
  width: number,
  height: number,
  options: QuireDrawingSelectedObjectViewOptions
): QuireViewNode {
  const drawing = options.drawing;
  const endpoints = drawing !== undefined && usesQuireDrawingEndpoints(drawing);
  const controls = drawing === undefined ? [] : resolveQuireDrawingControlPoints(drawing);
  const outlineOffset = resolveQuireDrawingSelectionOutlineOffset(drawing);
  return qkView.overlay({
    id: createSelectedDrawingNodeId(options, "root"),
    width,
    height,
    children: [
      ...(endpoints ? [] : [qkView.positioned({ left: -outlineOffset, top: -outlineOffset,
        width: width + outlineOffset * 2, height: height + outlineOffset * 2, child: qkView.surface({
        id: createSelectedDrawingNodeId(options, "outline"),
        width: width + outlineOffset * 2,
        height: height + outlineOffset * 2,
        interaction: { pointerEvents: "none" },
        style: { stroke: { color: selectionColor, width: outlineOffset > 0 ? 1 : 2,
          ...(outlineOffset > 0 ? { lineDash: [3, 3] } : {}) } }
      }) })]),
      ...createTextEntryTarget(options),
      ...(options.showMoveBands === false ? [] : endpoints ? createLineMoveTargets(options) : createMoveBands(width, height, options)),
      ...(endpoints ? [] : selectionHandles.map((descriptor) => createSelectionHandle(
        width,
        height,
        descriptor,
        options
      ))),
      ...(endpoints ? [] : createRotationAffordance(width, options)),
      ...controls.map(control => createGeometryControl(control, options))
    ]
  });
}
