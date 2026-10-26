import { qkView, type QuireViewNode } from "@quirekit/renderer";
import type { QuireDrawingSelectedObjectViewOptions } from "../types";
import { createSelectedDrawingNodeId } from "./shared";
import type { QuireDrawingEnterTextEventPayload } from "../types";
import { quireDrawingEnterTextHandlerId } from "./shared";
/**
 * Creates the selected-only inner story entry target.
 *
 * @param options - Stable object/story identity and accepted inner rectangle.
 * @returns One positioned single-click target, or none for non-text drawings.
 */
export function createTextEntryTarget(
  options: QuireDrawingSelectedObjectViewOptions
): readonly QuireViewNode[] {
  if (
    options.storyId === undefined
    || options.textInsetLeft === undefined
    || options.textInsetTop === undefined
    || options.textWidth === undefined
    || options.textHeight === undefined
    || options.textWidth <= 0
    || options.textHeight <= 0
  ) {
    return [];
  }
  const payload: QuireDrawingEnterTextEventPayload = {
    objectId: options.objectId,
    drawingId: options.drawingId,
    storyId: options.storyId
  };
  return [qkView.positioned({
    id: createSelectedDrawingNodeId(options, "text-entry-position"),
    left: options.textInsetLeft,
    top: options.textInsetTop,
    child: qkView.surface({
      id: createSelectedDrawingNodeId(options, "text-entry"),
      role: "control",
      part: "text-entry",
      width: options.textWidth,
      height: options.textHeight,
      events: {
        click: {
          handler: quireDrawingEnterTextHandlerId,
          payload
        }
      },
      interaction: { cursor: "text" }
    })
  })];
}
