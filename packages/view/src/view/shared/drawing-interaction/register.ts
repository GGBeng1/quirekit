import {
  quireDrawingEnterTextHandlerId,
  quireDrawingManipulationHandlerId
} from "@quirekit/view-engine";
import { createMountedDrawingInteractionRuntime } from "./runtime";
import type {
  RegisteredMountedDrawingInteraction,
  RegisterMountedDrawingInteractionOptions
} from "./types";

/**
 * Registers the built-in selected drawing event handler for one mounted view.
 *
 * @param options - Mounted scope, editor, status, and snapshot authority.
 * @returns Cleanup that removes the action and transient controller state.
 */
export function registerMountedDrawingInteraction(
  options: RegisterMountedDrawingInteractionOptions
): RegisteredMountedDrawingInteraction {
  const runtime = createMountedDrawingInteractionRuntime(options);
  const removeAction = options.scope.registerEventHandler(
    quireDrawingManipulationHandlerId,
    runtime.handle
  );
  const removeTextEntryAction = options.scope.registerEventHandler(
    quireDrawingEnterTextHandlerId,
    runtime.enterText
  );
  return {
    runtime,
    cleanup: () => {
      removeTextEntryAction();
      removeAction();
      runtime.destroy();
    }
  };
}
