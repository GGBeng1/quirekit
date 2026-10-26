import type { MountedDrawingInteractionRuntime } from "../types";

/**
 * Routes Escape and stationary modifiers to the active drawing capture owner.
 *
 * @param document - Mounted document owning keyboard delivery.
 * @param runtime - Exact drawing interaction owner for this view.
 * @returns Cleanup that releases both keyboard listeners.
 */
export function bindMountedDrawingKeyboard(
  document: Document,
  runtime: MountedDrawingInteractionRuntime
): () => void {
  /**
   * Reprojects only an active gesture; ordinary editor shortcuts pass through.
   * @param event - Native modifier transition.
   */
  const update = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && event.type === "keydown" && runtime.cancelManipulation()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    } else if (event.key === "Shift" && !event.repeat) {
      if (runtime.isCreationActive()) runtime.updateCreationModifiers(event.type === "keydown");
      else runtime.updateManipulationModifiers(event.type === "keydown");
    }
  };
  document.addEventListener("keydown", update, true);
  document.addEventListener("keyup", update, true);
  return () => {
    document.removeEventListener("keydown", update, true);
    document.removeEventListener("keyup", update, true);
  };
}
