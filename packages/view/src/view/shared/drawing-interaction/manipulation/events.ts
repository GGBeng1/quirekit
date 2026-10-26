import type { QuireViewEvent } from "@quirekit/renderer";
import type { QuireDrawingControllerState, QuireDrawingManipulationEventPayload } from "@quirekit/view-engine";
/**
 * Reports whether controller state carries paintable manipulation geometry.
 *
 * @param state - Current pure drawing-controller state.
 * @returns Whether the state owns an active transient preview frame.
 */
export function isActiveDrawingManipulation(
  state: QuireDrawingControllerState
): state is Extract<
  QuireDrawingControllerState,
  { readonly kind: "moving" | "resizing" | "rotating" | "controlling" }
> {
  return state.kind === "moving"
    || state.kind === "resizing"
    || state.kind === "rotating"
    || state.kind === "controlling";
}

/**
 * Claims one built-in drawing gesture from generic selection behavior.
 *
 * @param event - Current renderer-neutral pointer event.
 * @returns Nothing.
 */
export function claimDrawingPointerEvent(
  event: QuireViewEvent<unknown, QuireDrawingManipulationEventPayload>
): void {
  event.preventDefault();
  event.stopPropagation();
}
