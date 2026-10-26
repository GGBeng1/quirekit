import { qkView, type QuireViewNode } from "@quirekit/renderer";
import type { QuireDrawingSelectedObjectViewOptions } from "../types";
import { selectionColor, handleSize, handleHitSize, handleStrokeWidth, selectionHandleRadius, selectionHandleHitRadius, createSelectedDrawingNodeId, createManipulationEvents, createManipulationPayload, resolveResizeCursor } from "./shared";
import type { QuireDrawingResizeHandle } from "../../types";
/** Stable resize-handle locations in clockwise order. */
export const selectionHandles = [
  { handle: "north-west", inline: 0, block: 0 },
  { handle: "north", inline: 0.5, block: 0 },
  { handle: "north-east", inline: 1, block: 0 },
  { handle: "east", inline: 1, block: 0.5 },
  { handle: "south-east", inline: 1, block: 1 },
  { handle: "south", inline: 0.5, block: 1 },
  { handle: "south-west", inline: 0, block: 1 },
  { handle: "west", inline: 0, block: 0.5 }
] as const satisfies readonly {
  /** Resize handle identity. */
  readonly handle: QuireDrawingResizeHandle;
  /** Normalized inline location. */
  readonly inline: number;
  /** Normalized block location. */
  readonly block: number;
}[];

/**
 * Creates one captured resize handle centered on the accepted frame.
 *
 * @param width - Accepted drawing width.
 * @param height - Accepted drawing height.
 * @param descriptor - Handle identity and normalized location.
 * @param options - Stable source identity and resize policy.
 * @returns Positioned interactive handle product.
 */
export function createSelectionHandle(
  width: number,
  height: number,
  descriptor: typeof selectionHandles[number],
  options: QuireDrawingSelectedObjectViewOptions
): QuireViewNode {
  return qkView.positioned({
    id: createSelectedDrawingNodeId(
      options,
      `resize-${descriptor.handle}-position`
    ),
    left: descriptor.inline * width - selectionHandleHitRadius,
    top: descriptor.block * height - selectionHandleHitRadius,
    width: handleHitSize,
    height: handleHitSize,
    child: qkView.overlay({
      id: createSelectedDrawingNodeId(
        options,
        `resize-${descriptor.handle}-target`
      ),
      width: handleHitSize,
      height: handleHitSize,
      children: [
        qkView.surface({
          id: createSelectedDrawingNodeId(
            options,
            `resize-${descriptor.handle}-hit`
          ),
          role: "resize-handle",
          part: `resize-${descriptor.handle}`,
          width: handleHitSize,
          height: handleHitSize,
          events: createManipulationEvents(createManipulationPayload(
            options,
            "resize",
            descriptor.handle
          )),
          interaction: {
            cursor: resolveResizeCursor(descriptor.handle),
            captureCursor: "none"
          }
        }),
        qkView.positioned({
          id: createSelectedDrawingNodeId(
            options,
            `resize-${descriptor.handle}-visual-position`
          ),
          left: selectionHandleHitRadius - selectionHandleRadius,
          top: selectionHandleHitRadius - selectionHandleRadius,
          child: qkView.surface({
            id: createSelectedDrawingNodeId(
              options,
              `resize-${descriptor.handle}-visual`
            ),
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
  });
}
