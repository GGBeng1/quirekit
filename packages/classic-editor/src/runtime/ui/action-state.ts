import type {
  ClassicEditorActionContext, ClassicEditorActionDefinition, ClassicEditorActionState
} from "../../types";

/** @returns An immutable state for an unavailable action. */
export function createUnavailableClassicEditorActionState(): ClassicEditorActionState {
  return Object.freeze({ available: false, canExecute: false, active: false, reason: null });
}

/**
 * Reads the remaining state after the caller has established availability.
 * @param action - Direct definition whose availability has already been checked.
 * @param context - Exact occurrence context used for the availability query.
 * @returns Immutable enabled, active and disabled-reason presentation.
 */
export function readAvailableClassicEditorActionState(
  action: ClassicEditorActionDefinition,
  context: ClassicEditorActionContext
): ClassicEditorActionState {
  const canExecute = action.canExecute?.(context) !== false;
  return Object.freeze({
    available: true,
    canExecute,
    active: action.isActive?.(context) === true,
    reason: canExecute ? null : action.disabledReason?.(context)
      ?? Object.freeze({ code: "action-unavailable", message: action.label })
  });
}
