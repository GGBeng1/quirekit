import type { QuireViewEventBindingMap } from "@quirekit/renderer";
import type { QuireDrawingResizeHandle } from "../../types";
import type { QuireDrawingManipulationEventPayload, QuireDrawingSelectedObjectViewOptions } from "../types";
export const selectionColor = "#2563eb";
export const handleSize = 8;
export const handleHitSize = 16;
export const handleStrokeWidth = 2;
export const rotationHandleDistance = 18;
export const moveBandSize = 8;

/** Radius used to center compact resize handles on the accepted frame. */
export const selectionHandleRadius = handleSize / 2;
export const selectionHandleHitRadius = handleHitSize / 2;

/** Visual overflow required to retain the complete stroked handle outside the frame. */
export const quireDrawingSelectionHandleVisualRadius =
  selectionHandleRadius + handleStrokeWidth / 2;

/** Radius used to retain the complete pointer target around compact handles. */
export const quireDrawingSelectionHandleHitRadius = selectionHandleHitRadius;

/** Stable mounted action shared by Canvas and SVG drawing controls. */
export const quireDrawingManipulationHandlerId = "quire.wordDrawing.manipulate";

/** Stable mounted action that enters an independently editable text-box story. */
export const quireDrawingEnterTextHandlerId = "quire.wordDrawing.enterText";

/**
 * Creates one snapshot-unique selected-control node identity.
 *
 * @param options - Stable object and drawing identity.
 * @param part - Local selected-control role.
 * @returns Namespaced renderer node identity.
 */
export function createSelectedDrawingNodeId(
  options: QuireDrawingSelectedObjectViewOptions,
  part: string
): string {
  return [
    "word-drawing-selection",
    encodeURIComponent(options.objectId),
    encodeURIComponent(options.drawingId),
    part
  ].join(":");
}

/**
 * Creates one immutable manipulation payload for a selected control.
 *
 * @param options - Stable source identity and resize policy.
 * @param operation - Manipulation family requested by the control.
 * @param handle - Optional directional resize handle.
 * @returns Typed renderer-neutral event payload.
 */
export function createManipulationPayload(
  options: QuireDrawingSelectedObjectViewOptions,
  operation: QuireDrawingManipulationEventPayload["operation"],
  handle?: QuireDrawingResizeHandle
): QuireDrawingManipulationEventPayload {
  return {
    objectId: options.objectId,
    drawingId: options.drawingId,
    operation,
    ...(handle === undefined ? {} : { handle }),
    lockAspectRatio: options.lockAspectRatio
  };
}

/**
 * Binds every captured pointer phase to one manipulation action.
 *
 * @param payload - Stable manipulation payload.
 * @returns Shared event map consumed by every mounted backend.
 */
export function createManipulationEvents(
  payload: QuireDrawingManipulationEventPayload
): QuireViewEventBindingMap {
  const binding = {
    handler: quireDrawingManipulationHandlerId,
    payload
  } as const;
  return {
    pointerDown: binding,
    pointerMove: binding,
    pointerUp: binding,
    pointerCancel: binding
  };
}

/**
 * Resolves the CSS cursor for one directional resize handle.
 *
 * @param handle - Directional resize handle.
 * @returns CSS resize cursor matching the handle axis.
 */
export function resolveResizeCursor(handle: QuireDrawingResizeHandle): string {
  if (handle === "north" || handle === "south") return "ns-resize";
  if (handle === "east" || handle === "west") return "ew-resize";
  return handle === "north-west" || handle === "south-east"
    ? "nwse-resize"
    : "nesw-resize";
}
