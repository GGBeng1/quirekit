import { progressQuireDrawingCreation } from "./creation";
import { isSameQuireDrawingControllerIdentity } from "./identity";
import {
  activateQuireDrawingManipulation,
  updateQuireDrawingManipulation
} from "./manipulation";
import {
  createQuireDrawingTransition,
  isQuireDrawingManipulatingState,
  isQuireDrawingPreManipulationState,
  operationFromQuireDrawingActiveState,
  rejectQuireDrawingTransition
} from "./state";
import type {
  QuireDrawingControllerOptions,
  QuireDrawingControllerState,
  QuireDrawingControllerTransition,
  QuireDrawingPointerProgressEvent
} from "./types";

/**
 * Advances or finishes one captured drawing pointer gesture.
 *
 * @param state - Current drawing-controller state.
 * @param event - Normalized pointer update or completion.
 * @param options - Threshold and geometry policy.
 * @returns Transient preview, stable selection, or one final commit intent.
 */
export function progressQuireDrawingPointer(
  state: QuireDrawingControllerState,
  event: QuireDrawingPointerProgressEvent,
  options: QuireDrawingControllerOptions
): QuireDrawingControllerTransition {
  const validation = validateCapturedPointer(state, event.identity, event.pointerId);
  if (validation !== null) return validation;

  if (state.kind === "creating") {
    return progressQuireDrawingCreation(state, event, options);
  }
  if (isQuireDrawingPreManipulationState(state)) {
    const nextState = activateQuireDrawingManipulation(state, event, options);
    if (event.kind === "pointer-update") {
      return createQuireDrawingTransition(nextState);
    }
    if (isQuireDrawingPreManipulationState(nextState)) {
      return createQuireDrawingTransition({
        kind: "object-selected",
        identity: nextState.identity,
        frame: nextState.frame
      });
    }
    return completeQuireDrawingManipulation(nextState);
  }
  if (isQuireDrawingManipulatingState(state)) {
    const nextState = updateQuireDrawingManipulation(state, event, options);
    return event.kind === "pointer-update"
      ? createQuireDrawingTransition(nextState)
      : completeQuireDrawingManipulation(nextState);
  }
  return rejectQuireDrawingTransition(state, "invalid-state", false);
}

/**
 * Cancels one captured pointer gesture and discards its transient track.
 *
 * @param state - Current drawing-controller state.
 * @param identity - Identity captured by the pointer target.
 * @param pointerId - Browser pointer identifier.
 * @returns Stable state restored without a commit.
 */
export function cancelQuireDrawingPointer(
  state: QuireDrawingControllerState,
  identity: Parameters<typeof validateCapturedPointer>[1],
  pointerId: number
): QuireDrawingControllerTransition {
  const validation = validateCapturedPointer(state, identity, pointerId);
  if (validation !== null) return validation;
  if (state.kind === "creating") {
    return createQuireDrawingTransition({ kind: "idle" });
  }
  if (isQuireDrawingPreManipulationState(state)) {
    return createQuireDrawingTransition({
      kind: "object-selected",
      identity: state.identity,
      frame: state.frame
    });
  }
  if (isQuireDrawingManipulatingState(state)) {
    return createQuireDrawingTransition({
      kind: "object-selected",
      identity: state.identity,
      frame: state.track.startFrame
    });
  }
  return rejectQuireDrawingTransition(state, "invalid-state", false);
}

/**
 * Revalidates exact occurrence and pointer ownership before preview changes.
 *
 * @param state - Current captured state.
 * @param identity - Identity supplied by the mounted target.
 * @param pointerId - Pointer identifier supplied by the mounted target.
 * @returns A rejection transition, or null when capture remains valid.
 */
function validateCapturedPointer(
  state: QuireDrawingControllerState,
  identity: Extract<QuireDrawingControllerState, { identity: unknown }>["identity"],
  pointerId: number
): QuireDrawingControllerTransition | null {
  if (!("identity" in state) || !("pointer" in state)) {
    return rejectQuireDrawingTransition(state, "invalid-state", false);
  }
  if (!isSameQuireDrawingControllerIdentity(state.identity, identity)) {
    return rejectQuireDrawingTransition(state, "stale-identity", true);
  }
  if (state.pointer.pointerId !== pointerId) {
    return rejectQuireDrawingTransition(state, "pointer-mismatch", false);
  }
  return null;
}

/**
 * Converts the final preview into stable optimistic selection and one intent.
 *
 * @param state - Final active manipulation state.
 * @returns Stable selected state and one source mutation intent.
 */
function completeQuireDrawingManipulation(
  state: Extract<QuireDrawingControllerState, { kind: "moving" | "resizing" | "rotating" | "controlling" }>
): QuireDrawingControllerTransition {
  const operation = operationFromQuireDrawingActiveState(state);
  return {
    state: {
      kind: "object-selected",
      identity: state.identity,
      frame: state.track.previewFrame
    },
    commit: {
      kind: operation,
      identity: state.identity,
      frame: state.track.previewFrame,
      previousFrame: state.track.startFrame,
      drawing: state.track.previewDrawing,
      handle: state.handle
    }
  };
}
