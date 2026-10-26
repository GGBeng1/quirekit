import { addMountedPointerEventListener } from "./dom";

/**
 * Resolves the mounted elements that should receive pointer events for one surface.
 *
 * The coordinate surface owns document-space event mapping. The root is included
 * when it is a distinct element so editor-side blank space can still receive
 * pointer diagnostics and pointer-down selection starts.
 *
 * @param root - Mounted editor root, which can cover editor-side blanks.
 * @param coordinateSurface - Document-space surface used for coordinate mapping.
 * @returns Pointer event targets without duplicates.
 */
export function resolveMountedPointerEventTargets(
  root: EventTarget,
  coordinateSurface: EventTarget
): readonly EventTarget[] {
  return root === coordinateSurface ? [root] : [coordinateSurface, root];
}

/**
 * Adds one event listener to every mounted pointer event target.
 *
 * @param removeListeners - Cleanup list owned by the pointer binding.
 * @param targets - Event targets receiving the listener.
 * @param type - Browser event type.
 * @param listener - Event listener to register.
 */
export function addMountedPointerEventListenerToTargets(
  removeListeners: Array<() => void>,
  targets: readonly EventTarget[],
  type: string,
  listener: EventListener
): void {
  for (const target of targets) {
    addMountedPointerEventListener(removeListeners, target, type, listener);
  }
}
