import type { QuireKeyboardInputEvent } from "../types";

/**
 * Checks whether a keydown event requests platform select-all behavior.
 *
 * @param event - Keyboard event-like object.
 * @returns Whether the event should select the full editor document.
 */
export function isSelectAllShortcut(event: QuireKeyboardInputEvent): boolean {
  return (
    event.key.toLowerCase() === "a" &&
    (event.ctrlKey === true || event.metaKey === true) &&
    event.altKey !== true
  );
}
