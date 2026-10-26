/**
 * Guards activation before the locked Ark keyboard handler receives the event.
 *
 * @param event - Native key event captured by the single Listbox focus owner.
 * @param disabled - Whether the whole Listbox is unavailable.
 * @param highlightedDisabled - Whether the current visible candidate became disabled.
 */
export function guardListboxActivation(
  event: KeyboardEvent,
  disabled: boolean,
  highlightedDisabled: boolean
): void {
  const space = event.key === " " || event.key === "Spacebar";
  if (disabled || (!space && event.key !== "Enter")) return;

  // Ark 5.39.1 does not check these cancellation boundaries in its activation branch.
  if (event.defaultPrevented || event.isComposing || event.keyCode === 229) {
    event.stopImmediatePropagation();
    return;
  }
  if (highlightedDisabled) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }

  // Only cancel the browser's page-scroll default; Ark still owns the actual selection.
  if (space) event.preventDefault();
}
