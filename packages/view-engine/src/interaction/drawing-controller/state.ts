import type {
  QuireDrawingControllerState,
  QuireDrawingControllerTransition,
  QuireDrawingManipulatingState,
  QuireDrawingPreManipulationState
} from "./types";

/**
 * Creates the stable initial controller state.
 *
 * @returns Idle drawing-controller state.
 */
export function createQuireDrawingControllerState(): QuireDrawingControllerState {
  return { kind: "idle" };
}

/**
 * Reports whether a state is threshold-gated manipulation.
 *
 * @param state - Candidate controller state.
 * @returns Whether the state is pre-move, pre-resize, or pre-rotate.
 */
export function isQuireDrawingPreManipulationState(
  state: QuireDrawingControllerState | QuireDrawingPreManipulationState | QuireDrawingManipulatingState
): state is QuireDrawingPreManipulationState {
  return state.kind === "pre-move"
    || state.kind === "pre-resize"
    || state.kind === "pre-rotate"
    || state.kind === "pre-control";
}

/**
 * Reports whether a state owns an active transient manipulation track.
 *
 * @param state - Candidate controller state.
 * @returns Whether the state is moving, resizing, or rotating.
 */
export function isQuireDrawingManipulatingState(
  state: QuireDrawingControllerState
): state is QuireDrawingManipulatingState {
  return state.kind === "moving"
    || state.kind === "resizing"
    || state.kind === "rotating"
    || state.kind === "controlling";
}

/**
 * Resolves the manipulation family from a pre-state.
 *
 * @param state - Pre-manipulation state.
 * @returns Manipulation family.
 */
export function operationFromQuireDrawingPreState(
  state: QuireDrawingPreManipulationState
): "move" | "resize" | "rotate" | "control" {
  return state.kind === "pre-move" ? "move" : state.kind === "pre-resize" ? "resize" : state.kind === "pre-control" ? "control" : "rotate";
}

/**
 * Resolves the manipulation family from an active state.
 *
 * @param state - Active manipulation state.
 * @returns Manipulation family.
 */
export function operationFromQuireDrawingActiveState(
  state: QuireDrawingManipulatingState
): "move" | "resize" | "rotate" | "control" {
  return state.kind === "moving" ? "move" : state.kind === "resizing" ? "resize" : state.kind === "controlling" ? "control" : "rotate";
}

/**
 * Creates a non-committing successful transition.
 *
 * @param state - Next controller state.
 * @returns Transition without a commit.
 */
export function createQuireDrawingTransition(
  state: QuireDrawingControllerState
): QuireDrawingControllerTransition {
  return { state, commit: null };
}

/**
 * Creates an explicit rejected transition.
 *
 * @param state - Current controller state.
 * @param rejection - Rejection classification.
 * @param clearPreview - Whether stale capture must clear transient state.
 * @returns Rejected transition without a commit.
 */
export function rejectQuireDrawingTransition(
  state: QuireDrawingControllerState,
  rejection: NonNullable<QuireDrawingControllerTransition["rejection"]>,
  clearPreview: boolean
): QuireDrawingControllerTransition {
  return {
    state: clearPreview ? { kind: "idle" } : state,
    commit: null,
    rejection
  };
}
