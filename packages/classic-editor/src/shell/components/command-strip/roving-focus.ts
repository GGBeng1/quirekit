/** Selector for keyboard-reachable Command Strip controls. */
const commandFocusSelector = '[data-command-strip-focus="true"]';

/**
 * Restores exactly one tab stop after responsive projection changes.
 *
 * @param root - Active Command Strip toolbar.
 */
export function synchronizeClassicEditorCommandRovingFocus(root: HTMLElement): void {
  const candidates = focusCandidates(root);
  const retained = candidates.find((candidate) => candidate.dataset.rovingCurrent === "true")
    ?? candidates[0];
  for (const candidate of root.querySelectorAll<HTMLElement>(commandFocusSelector)) {
    candidate.tabIndex = candidate === retained ? 0 : -1;
    if (candidate === retained) candidate.dataset.rovingCurrent = "true";
    else delete candidate.dataset.rovingCurrent;
  }
}

/**
 * Moves focus inside the current visual Command Strip order.
 *
 * @param root - Active Command Strip toolbar.
 * @param event - Keyboard event from one command or overflow trigger.
 * @returns Whether the event was handled as roving navigation.
 */
export function moveClassicEditorCommandRovingFocus(
  root: HTMLElement,
  event: KeyboardEvent
): boolean {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return false;
  const candidates = focusCandidates(root);
  if (candidates.length === 0) return false;
  const current = event.target instanceof root.ownerDocument.defaultView!.HTMLElement
    ? event.target
    : null;
  const currentIndex = Math.max(0, candidates.indexOf(current as HTMLButtonElement));
  const nextIndex = event.key === "Home" ? 0
    : event.key === "End" ? candidates.length - 1
      : event.key === "ArrowRight"
        ? (currentIndex + 1) % candidates.length
        : (currentIndex - 1 + candidates.length) % candidates.length;
  event.preventDefault();
  markCurrent(candidates, candidates[nextIndex]!);
  candidates[nextIndex]!.focus();
  return true;
}

/** @param root - Command Strip toolbar. @returns Enabled controls in DOM order. */
function focusCandidates(root: HTMLElement): HTMLButtonElement[] {
  return [...root.querySelectorAll<HTMLButtonElement>(commandFocusSelector)]
    .filter((candidate) => !candidate.disabled && !candidate.hidden);
}

/** @param candidates - Roving controls. @param current - New current tab stop. */
function markCurrent(
  candidates: readonly HTMLButtonElement[],
  current: HTMLButtonElement
): void {
  for (const candidate of candidates) {
    candidate.tabIndex = candidate === current ? 0 : -1;
    if (candidate === current) candidate.dataset.rovingCurrent = "true";
    else delete candidate.dataset.rovingCurrent;
  }
}
