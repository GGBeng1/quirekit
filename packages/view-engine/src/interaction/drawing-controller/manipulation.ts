import { createQuireDrawingControlTrack } from "../../drawing/control-points";
import {
  createQuireDrawingManipulationTrack,
  measureQuireDrawingPointerDistance
} from "./geometry";
import {
  operationFromQuireDrawingActiveState,
  operationFromQuireDrawingPreState
} from "./state";
import type {
  QuireDrawingControllerOptions,
  QuireDrawingManipulatingState,
  QuireDrawingPointerProgressEvent,
  QuireDrawingPreManipulationState
} from "./types";

const defaultDragThreshold = 6;

/**
 * Crosses the click-versus-drag threshold and creates the first preview track.
 *
 * @param state - Pre-manipulation state.
 * @param event - Current pointer facts.
 * @param options - Threshold and geometry policy.
 * @returns Original pre-state below threshold or active manipulation state.
 */
export function activateQuireDrawingManipulation(
  state: QuireDrawingPreManipulationState,
  event: QuireDrawingPointerProgressEvent,
  options: QuireDrawingControllerOptions
): QuireDrawingPreManipulationState | QuireDrawingManipulatingState {
  if (measureQuireDrawingPointerDistance(
    state.pointer.clientPoint,
    event.clientPoint
  ) < (options.dragThreshold ?? defaultDragThreshold)) {
    return state;
  }
  const operation = operationFromQuireDrawingPreState(state);
  return {
    kind: operation === "move" ? "moving" : operation === "resize" ? "resizing" : operation === "control" ? "controlling" : "rotating",
    identity: state.identity,
    pointer: state.pointer,
    handle: state.handle,
    control: state.control,
    drawing: state.drawing,
    lockAspectRatio: state.lockAspectRatio,
    track: operation === "control"
      ? createQuireDrawingControlTrack(state.drawing!, state.control!, state.frame, state.pointer.point, event.point, event.shiftKey ?? false)
      : createQuireDrawingManipulationTrack(
      operation,
      state.frame,
      state.pointer.point,
      event.point,
      state.handle,
      state.lockAspectRatio || (operation === "resize" && event.shiftKey === true),
      options
    )
  };
}

/**
 * Replaces only the preview track of an active manipulation.
 *
 * @param state - Active manipulation state.
 * @param event - Current pointer facts.
 * @param options - Geometry policy.
 * @returns Active state with an updated immutable track.
 */
export function updateQuireDrawingManipulation(
  state: QuireDrawingManipulatingState,
  event: QuireDrawingPointerProgressEvent,
  options: QuireDrawingControllerOptions
): QuireDrawingManipulatingState {
  const operation = operationFromQuireDrawingActiveState(state);
  return {
    ...state,
    track: operation === "control"
      ? createQuireDrawingControlTrack(state.drawing!, state.control!, state.track.startFrame, state.pointer.point, event.point, event.shiftKey ?? false)
      : createQuireDrawingManipulationTrack(
      operation,
      state.track.startFrame,
      state.pointer.point,
      event.point,
      state.handle,
      state.lockAspectRatio || (operation === "resize" && event.shiftKey === true),
      options
    )
  };
}
