/**
 * Adds one DOM event listener owned by a mounted pointer binding.
 *
 * @param removeListeners - Listener cleanup registry.
 * @param target - Event target receiving the listener.
 * @param type - Browser event type.
 * @param listener - Event listener to register.
 */
export function addMountedPointerEventListener(
  removeListeners: Array<() => void>,
  target: EventTarget,
  type: string,
  listener: EventListener
): void {
  target.addEventListener(type, listener);
  removeListeners.push(() => {
    target.removeEventListener(type, listener);
  });
}

/**
 * Clears any browser-owned native selection near the mounted editor.
 *
 * @param ownerDocument - Document that owns the mounted view.
 */
export function clearMountedNativeSelection(ownerDocument: Document): void {
  // The input proxy's native selection belongs to the active keyboard/IME.
  // Clearing it on a second tap can invalidate that native input session.
  const active = ownerDocument.activeElement;
  if (active && active.getAttribute("data-qk-input-proxy") !== null) return;
  ownerDocument.getSelection?.()?.removeAllRanges();
}

/**
 * Attempts to capture a browser pointer for drag selection.
 *
 * Synthetic pointer events used by tests may not have an active browser pointer,
 * so pointer capture is best-effort for every mounted backend.
 *
 * @param surface - Surface receiving pointer capture.
 * @param pointerId - Browser pointer identifier.
 */
export function trySetMountedPointerCapture(
  surface: SVGSVGElement | HTMLElement,
  pointerId: number
): void {
  try {
    surface.setPointerCapture?.(pointerId);
  } catch {
    // Pointer capture is optional for synthetic events and stale pointer ids.
  }
}

/**
 * Releases a captured pointer when the browser still reports ownership.
 *
 * @param surface - Surface that may own pointer capture.
 * @param pointerId - Browser pointer identifier.
 */
export function tryReleaseMountedPointerCapture(
  surface: SVGSVGElement | HTMLElement,
  pointerId: number
): void {
  if (!surface.releasePointerCapture || !surface.hasPointerCapture?.(pointerId)) {
    return;
  }

  try {
    surface.releasePointerCapture(pointerId);
  } catch {
    // Release is best-effort; some synthetic/browser edge paths report a stale id.
  }
}
