import { cancelQuireDrawingPointer, progressQuireDrawingPointer } from "./pointer";
import { escapeQuireDrawingState } from "./selection";
import {
  beginQuireDrawingCreation,
  beginQuireDrawingManipulation
} from "./start";
import { isSameQuireDrawingControllerIdentity } from "./identity";
import {
  createQuireDrawingTransition,
  createQuireDrawingControllerState,
  rejectQuireDrawingTransition
} from "./state";
import type {
  QuireDrawingControllerEvent,
  QuireDrawingControllerOptions,
  QuireDrawingControllerState,
  QuireDrawingControllerTransition
} from "./types";

export { createQuireDrawingControllerState } from "./state";

/**
 * Reduces one renderer-neutral drawing interaction event.
 *
 * @param state - Current drawing-controller state.
 * @param event - Normalized interaction event.
 * @param options - Optional gesture and geometry policy.
 * @returns Next state, optional rejection, and at most one final commit intent.
 */
export function reduceQuireDrawingController(
  state: QuireDrawingControllerState,
  event: QuireDrawingControllerEvent,
  options: QuireDrawingControllerOptions = {}
): QuireDrawingControllerTransition {
  switch (event.kind) {
    case "select-object":
      return createQuireDrawingTransition({
        kind: "object-selected",
        identity: event.identity,
        frame: event.frame
      });
    case "clear-selection":
      return createQuireDrawingTransition(createQuireDrawingControllerState());
    case "escape":
      return escapeQuireDrawingState(state);
    case "enter-text":
      if (
        state.kind !== "object-selected"
        || !isSameQuireDrawingControllerIdentity(state.identity, event.identity)
      ) {
        return rejectQuireDrawingTransition(state, "invalid-state", false);
      }
      return createQuireDrawingTransition({
        kind: "text-editing",
        identity: state.identity,
        frame: state.frame,
        storyId: event.storyId
      });
    case "begin-create":
      return beginQuireDrawingCreation(event, options);
    case "begin-manipulation":
      return beginQuireDrawingManipulation(state, event);
    case "pointer-update":
    case "pointer-end":
      return progressQuireDrawingPointer(state, event, options);
    case "pointer-cancel":
      return cancelQuireDrawingPointer(
        state,
        event.identity,
        event.pointerId
      );
  }
}
