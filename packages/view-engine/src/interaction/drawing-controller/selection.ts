import {
  createQuireDrawingTransition
} from "./state";
import type {
  QuireDrawingControllerState,
  QuireDrawingControllerTransition
} from "./types";

/**
 * Unwinds one drawing interaction layer without mutating document state.
 *
 * @param state - Current drawing-controller state.
 * @returns The nearest stable selection state.
 */
export function escapeQuireDrawingState(
  state: QuireDrawingControllerState
): QuireDrawingControllerTransition {
  if (state.kind === "text-editing") {
    return createQuireDrawingTransition({
      kind: "object-selected",
      identity: state.identity,
      frame: state.frame
    });
  }
  if (state.kind === "creating") {
    return createQuireDrawingTransition({ kind: "idle" });
  }
  if (
    state.kind === "pre-move"
    || state.kind === "pre-resize"
    || state.kind === "pre-rotate"
    || state.kind === "pre-control"
  ) {
    return createQuireDrawingTransition({
      kind: "object-selected",
      identity: state.identity,
      frame: state.frame
    });
  }
  if (
    state.kind === "moving"
    || state.kind === "resizing"
    || state.kind === "rotating"
    || state.kind === "controlling"
  ) {
    return createQuireDrawingTransition({
      kind: "object-selected",
      identity: state.identity,
      frame: state.track.startFrame
    });
  }
  return createQuireDrawingTransition(state);
}
