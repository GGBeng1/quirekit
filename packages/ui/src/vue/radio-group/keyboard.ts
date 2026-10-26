const selectionKeys = new Set([" ", "Spacebar", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

/**
 * Keeps a focusable readonly radio from invoking native keyboard selection.
 * @param event - Captured keyboard event inside the radio group.
 * @param readOnly - Whether selection is currently readonly.
 */
export function guardRadioReadOnlyKey(event: KeyboardEvent, readOnly: boolean): void {
  if (!readOnly || !selectionKeys.has(event.key)) return;
  const target = event.target;
  if (!(target instanceof Element) || target.tagName !== "INPUT" || target.getAttribute("type") !== "radio") return;
  event.preventDefault();
}
