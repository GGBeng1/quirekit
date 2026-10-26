import type {
  QuireInteractionSelectionCommandTargetKind,
  QuireInteractionSelectionTarget
} from "@quirekit/view-engine";
import {
  resolveDefaultQuireViewPointerPolicyForLayer,
  type QuireViewPointerPolicy
} from "@quirekit/view-engine";

export const defaultSelectionPointerPolicy: QuireViewPointerPolicy =
  resolveDefaultQuireViewPointerPolicyForLayer({ plane: "content" });

/**
 * Resolves the retained pointer policy for one interaction target.
 *
 * @param interactionTarget - Interaction target produced by hit testing.
 * @returns Explicit or default pointer policy for the target.
 */
export function resolveMountedTargetPointerPolicy(
  interactionTarget: QuireInteractionSelectionTarget | null | undefined
): QuireViewPointerPolicy {
  if (interactionTarget === null || interactionTarget === undefined) {
    return defaultSelectionPointerPolicy;
  }

  if (interactionTarget.pointerPolicy !== undefined) {
    return interactionTarget.pointerPolicy;
  }

  if (interactionTarget.layer !== undefined) {
    return resolveDefaultQuireViewPointerPolicyForLayer(interactionTarget.layer);
  }

  if (isMountedPointerDispatchCommandTarget(interactionTarget.commandTarget)) {
    return resolveDefaultQuireViewPointerPolicyForLayer({ plane: "controls" });
  }

  return defaultSelectionPointerPolicy;
}

/**
 * Reports whether a command target should be dispatched instead of selected.
 *
 * @param commandTarget - Command target classified by selection semantics.
 * @returns Whether pointerdown should route to the target without text selection.
 */
function isMountedPointerDispatchCommandTarget(
  commandTarget: QuireInteractionSelectionCommandTargetKind
): boolean {
  return (
    commandTarget === "content-control" ||
    commandTarget === "widget" ||
    commandTarget === "control"
  );
}
