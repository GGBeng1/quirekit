/**
 * Clears the textarea value and collapses its native selection to a stable origin.
 *
 * @param inputProxy - Textarea input proxy owned by the mounted view.
 */
export function clearQuireInputProxyValue(inputProxy: HTMLTextAreaElement): void {
  inputProxy.value = "";

  try {
    inputProxy.setSelectionRange?.(0, 0);
  } catch (_error) {
    // Some test doubles and platform input hosts do not expose a writable selection.
  }
}

/**
 * Restarts the browser-owned input session when JS state reset is not enough.
 *
 * @param inputProxy - Textarea input proxy owned by the mounted view.
 */
export function restartQuireNativeInputSession(
  inputProxy: HTMLTextAreaElement
): void {
  if (inputProxy.ownerDocument.activeElement !== inputProxy) {
    return;
  }

  inputProxy.blur();
}

/**
 * Reads browser IME evidence independently of the cancelable JS composition state.
 *
 * @param event - Input-proxy event, including compatibility-only IME signals.
 * @returns Whether the native session may need a blur before pointer re-anchoring.
 */
export function hasQuireNativeCompositionEvidence(event: Event): boolean {
  const inputEvent = event as InputEvent;
  return event.type.startsWith("composition")
    || inputEvent.isComposing === true
    || (event.type === "keydown" && (event as KeyboardEvent).keyCode === 229)
    || inputEvent.inputType === "insertCompositionText"
    || inputEvent.inputType === "deleteCompositionText"
    || inputEvent.inputType === "insertFromComposition"
    || inputEvent.inputType === "deleteByComposition";
}
