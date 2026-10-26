import { constrainQuireDrawingCreationPoint } from "./geometry/creation";
import {
  createQuireDrawingCreationTrack,
  measureQuireDrawingPointerDistance
} from "./geometry";
import { createQuireDrawingTransition } from "./state";
import type {
  QuireDrawingControllerOptions,
  QuireDrawingControllerTransition,
  QuireDrawingCreatingState,
  QuireDrawingPointerProgressEvent
} from "./types";

const defaultDragThreshold = 6;

/**
 * Updates provisional creation or emits its one final commit.
 *
 * @param state - Current creation state.
 * @param event - Pointer update or end.
 * @param options - Threshold and geometry policy.
 * @returns Updated creation state or selected optimistic result with one commit.
 */
export function progressQuireDrawingCreation(
  state: QuireDrawingCreatingState,
  event: QuireDrawingPointerProgressEvent,
  options: QuireDrawingControllerOptions
): QuireDrawingControllerTransition {
  const dragged = state.dragged || measureQuireDrawingPointerDistance(
    state.pointer.clientPoint,
    event.clientPoint
  ) >= (options.dragThreshold ?? defaultDragThreshold);
  const isLine = state.geometry?.kind === "preset" && /^(?:line|lineInv|straightConnector1|(?:bent|curved)Connector[2-5])$/.test(state.geometry.preset);
  const point = dragged && event.shiftKey
    ? constrainQuireDrawingCreationPoint(state.pointer.point, event.point,
      state.drawingKind === "shape" ? 1 : state.defaultExtent.width / state.defaultExtent.height,
      state.geometry?.kind === "preset" && /^(?:line|lineInv|straightConnector1)$/.test(state.geometry.preset))
    : event.point;
  const baseTrack = createQuireDrawingCreationTrack(
    state.pointer.point,
    point,
    state.defaultExtent,
    dragged,
    isLine ? { width: 1, height: 1 } : options.minimumExtent
  );
  const track = isLine ? { ...baseTrack, flipVertical: dragged
    && (point.x - state.pointer.point.x) * (point.y - state.pointer.point.y) < 0 } : baseTrack;
  if (event.kind === "pointer-update") {
    return createQuireDrawingTransition({ ...state, dragged, track });
  }
  return {
    state: {
      kind: "object-selected",
      identity: state.identity,
      frame: track.previewFrame
    },
    commit: {
      kind: "create",
      identity: state.identity,
      frame: track.previewFrame,
      drawingKind: state.drawingKind,
      geometry: state.geometry,
      flipVertical: track.flipVertical
    }
  };
}
