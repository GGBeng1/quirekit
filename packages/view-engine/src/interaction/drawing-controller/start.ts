import { resolveQuireDrawingControlPoints } from "../../drawing/control-points";
import { createQuireDrawingCreationTrack } from "./geometry";
import { isSameQuireDrawingControllerIdentity } from "./identity";
import {
  createQuireDrawingTransition,
  rejectQuireDrawingTransition
} from "./state";
import type {
  QuireDrawingBeginCreateEvent,
  QuireDrawingBeginManipulationEvent,
  QuireDrawingControllerOptions,
  QuireDrawingControllerState,
  QuireDrawingControllerTransition
} from "./types";

/**
 * Begins provisional drawing creation.
 *
 * @param event - Creation start facts.
 * @param options - Geometry policy.
 * @returns Creation controller state.
 */
export function beginQuireDrawingCreation(
  event: QuireDrawingBeginCreateEvent,
  options: QuireDrawingControllerOptions
): QuireDrawingControllerTransition {
  const track = createQuireDrawingCreationTrack(
    event.point,
    event.point,
    event.defaultExtent,
    false,
    options.minimumExtent
  );
  return createQuireDrawingTransition({
    kind: "creating",
    identity: event.identity,
    drawingKind: event.drawingKind,
    geometry: event.geometry,
    pointer: {
      pointerId: event.pointerId,
      clientPoint: event.clientPoint,
      point: event.point
    },
    defaultExtent: event.defaultExtent,
    track,
    dragged: false
  });
}

/**
 * Begins a threshold-gated manipulation from stable object selection.
 *
 * @param state - Current controller state.
 * @param event - Manipulation start facts.
 * @returns Pre-manipulation state or explicit rejection.
 */
export function beginQuireDrawingManipulation(
  state: QuireDrawingControllerState,
  event: QuireDrawingBeginManipulationEvent
): QuireDrawingControllerTransition {
  if (
    state.kind !== "object-selected"
    || !isSameQuireDrawingControllerIdentity(state.identity, event.identity)
    || (event.operation === "resize" && event.handle === undefined)
    || (event.operation === "control" && (event.drawing === undefined || event.control === undefined
      || !resolveQuireDrawingControlPoints(event.drawing).some(({ reference }) =>
        reference.kind === "endpoint" && event.control?.kind === "endpoint" ? reference.end === event.control.end
          : reference.kind === "adjustment" && event.control?.kind === "adjustment" && reference.index === event.control.index)))
  ) {
    return rejectQuireDrawingTransition(state, "invalid-state", false);
  }
  const kind = event.operation === "move"
    ? "pre-move"
    : event.operation === "resize"
      ? "pre-resize"
      : event.operation === "control" ? "pre-control" : "pre-rotate";
  return createQuireDrawingTransition({
    kind,
    identity: state.identity,
    frame: state.frame,
    pointer: {
      pointerId: event.pointerId,
      clientPoint: event.clientPoint,
      point: event.point
    },
    handle: event.handle,
    drawing: event.drawing,
    control: event.control,
    lockAspectRatio: event.lockAspectRatio
  });
}
