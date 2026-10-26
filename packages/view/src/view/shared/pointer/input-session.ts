import type { SynchronizeMountedPointerInputOptions } from "./types";

/**
 * Restarts native input only when retained pointer policy assigns the action.
 *
 * @param options - Input binding and authoritative pointer-policy decision.
 */
export function synchronizeMountedPointerInput(
  options: SynchronizeMountedPointerInputOptions
): void {
  if (!options.decision.shouldStartSelection && !options.decision.shouldFocusEditor) {
    return;
  }
  options.inputBinding?.resetTransientState({ restartNativeInput: options.pointerType === "touch" ? false : "if-needed" });
}
