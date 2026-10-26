import { qkView, resolveQuirePointBounds, translateQuireHitArea, type QuireViewNode } from "@quirekit/renderer";
import { resolveQuireDrawingLineHitAreas } from "../../../../drawing/hit-targets";
import type { QuireDrawingSelectedObjectViewOptions } from "../types";
import { createManipulationEvents, createManipulationPayload, createSelectedDrawingNodeId } from "./shared";

/**
 * Creates move targets using the same path corridors as initial object selection.
 * @param options - Source geometry and exact selection identity.
 * @returns Bounded line-body targets below endpoint and adjustment markers.
 */
export function createLineMoveTargets(options: QuireDrawingSelectedObjectViewOptions): readonly QuireViewNode[] {
  return (resolveQuireDrawingLineHitAreas(options.drawing!) ?? []).map((area, index) => {
    const rect = resolveQuirePointBounds(area.points);
    return qkView.positioned({ left: rect.x, top: rect.y, width: rect.width, height: rect.height, child: qkView.surface({
      id: createSelectedDrawingNodeId(options, `move-line-${index}`), role: "control", part: "move-line",
      width: rect.width, height: rect.height,
      interaction: { cursor: "move", captureCursor: "none", hitArea: translateQuireHitArea(area, -rect.x, -rect.y) },
      events: createManipulationEvents(createManipulationPayload(options, "move"))
    }) });
  });
}
