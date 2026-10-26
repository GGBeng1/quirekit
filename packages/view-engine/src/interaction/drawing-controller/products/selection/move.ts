import { qkView, type QuireViewNode } from "@quirekit/renderer";
import type { QuireDrawingSelectedObjectViewOptions } from "../types";
import { moveBandSize, createSelectedDrawingNodeId, createManipulationEvents, createManipulationPayload } from "./shared";
/**
 * Creates four transparent edge bands that request object translation.
 *
 * @param width - Accepted drawing width.
 * @param height - Accepted drawing height.
 * @param options - Stable source identity and resize policy.
 * @returns Positioned move targets inside the accepted contribution bounds.
 */
export function createMoveBands(
  width: number,
  height: number,
  options: QuireDrawingSelectedObjectViewOptions
): readonly QuireViewNode[] {
  return [
    createMoveBand("north", 0, 0, width, moveBandSize, options),
    createMoveBand(
      "east",
      Math.max(0, width - moveBandSize),
      0,
      moveBandSize,
      height,
      options
    ),
    createMoveBand(
      "south",
      0,
      Math.max(0, height - moveBandSize),
      width,
      moveBandSize,
      options
    ),
    createMoveBand("west", 0, 0, moveBandSize, height, options)
  ];
}

/**
 * Creates one transparent captured move target.
 *
 * @param part - Stable frame edge identity.
 * @param left - Local horizontal target origin.
 * @param top - Local vertical target origin.
 * @param width - Target width.
 * @param height - Target height.
 * @param options - Stable source identity and resize policy.
 * @returns Positioned renderer-neutral move target.
 */
export function createMoveBand(
  part: string,
  left: number,
  top: number,
  width: number,
  height: number,
  options: QuireDrawingSelectedObjectViewOptions
): QuireViewNode {
  return qkView.positioned({
    id: createSelectedDrawingNodeId(options, `move-${part}-position`),
    left,
    top,
    child: qkView.surface({
      id: createSelectedDrawingNodeId(options, `move-${part}`),
      role: "control",
      part: `move-${part}`,
      width,
      height,
      events: createManipulationEvents(createManipulationPayload(
        options,
        "move"
      )),
      interaction: { cursor: "move", captureCursor: "none" }
    })
  });
}
