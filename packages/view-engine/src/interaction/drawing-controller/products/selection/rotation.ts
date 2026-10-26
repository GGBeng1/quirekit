import { qkView, type QuireViewNode } from "@quirekit/renderer";
import type { QuireDrawingSelectedObjectViewOptions } from "../types";
import { selectionColor, handleSize, handleHitSize, handleStrokeWidth, rotationHandleDistance, selectionHandleRadius, selectionHandleHitRadius, createSelectedDrawingNodeId, createManipulationEvents, createManipulationPayload } from "./shared";
/**
 * Creates a compact top-center rotation affordance outside the object bounds.
 *
 * @param width - Accepted drawing width.
 * @param options - Stable source identity and resize policy.
 * @returns Stem and handle products, or none when rotation chrome is disabled.
 */
export function createRotationAffordance(
  width: number,
  options: QuireDrawingSelectedObjectViewOptions
): readonly QuireViewNode[] {
  if (
    options.showRotationHandle !== true
    || width < handleSize * 4
  ) return [];
  const center = width / 2;
  const handleTop = -rotationHandleDistance - selectionHandleHitRadius;
  const stemTop = -rotationHandleDistance + handleSize / 2;
  return [
    qkView.positioned({
      id: createSelectedDrawingNodeId(options, "rotation-stem-position"),
      left: center - 1,
      top: stemTop,
      child: qkView.surface({
        id: createSelectedDrawingNodeId(options, "rotation-stem"),
        width: 2,
        height: -stemTop,
        interaction: { pointerEvents: "none" },
        style: { fill: selectionColor }
      })
    }),
    qkView.positioned({
      id: createSelectedDrawingNodeId(options, "rotation-handle-position"),
      left: center - selectionHandleHitRadius,
      top: handleTop,
      width: handleHitSize,
      height: handleHitSize,
      child: qkView.overlay({
        id: createSelectedDrawingNodeId(options, "rotation-handle-target"),
        width: handleHitSize,
        height: handleHitSize,
        children: [
          qkView.surface({
            id: createSelectedDrawingNodeId(options, "rotation-handle-hit"),
            role: "rotate-handle",
            part: "rotate",
            width: handleHitSize,
            height: handleHitSize,
            events: createManipulationEvents(createManipulationPayload(
              options,
              "rotate"
            )),
            interaction: { cursor: "grab", captureCursor: "none" }
          }),
          qkView.positioned({
            id: createSelectedDrawingNodeId(
              options,
              "rotation-handle-visual-position"
            ),
            left: selectionHandleHitRadius - selectionHandleRadius,
            top: selectionHandleHitRadius - selectionHandleRadius,
            child: qkView.surface({
              id: createSelectedDrawingNodeId(options, "rotation-handle-visual"),
              width: handleSize,
              height: handleSize,
              interaction: { pointerEvents: "none" },
              style: {
                fill: selectionColor,
                stroke: { color: "#ffffff", width: handleStrokeWidth },
                borderRadius: handleSize / 2
              }
            })
          })
        ]
      })
    })
  ];
}
