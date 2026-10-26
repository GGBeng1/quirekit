import type { QuireKeyboardInputEvent } from "./types";

export {
  findNextQuireWordBoundary,
  findPreviousQuireWordBoundary
} from "@quirekit/layout/text";

/**
 * Checks whether canvas must own keyboard navigation instead of PM keymaps.
 *
 * @param event - Keyboard event-like object.
 * @returns Whether the key changes caret or selection geometry.
 */
export function isQuireOwnedNavigationKey(
  event: QuireKeyboardInputEvent
): boolean {
  switch (event.key) {
    case "ArrowLeft":
    case "ArrowRight":
    case "ArrowUp":
    case "ArrowDown":
    case "Home":
    case "End":
    case "PageUp":
    case "PageDown":
      return true;
    default:
      return false;
  }
}

/**
 * Checks whether a horizontal arrow should move by word boundaries.
 *
 * @param event - Keyboard event-like object.
 * @returns Whether the key uses word navigation.
 */
export function isWordNavigationShortcut(
  event: QuireKeyboardInputEvent
): boolean {
  return event.metaKey !== true && (event.altKey === true || event.ctrlKey === true);
}

/**
 * Checks whether a key should move to the document boundary.
 *
 * @param event - Keyboard event-like object.
 * @returns Whether document-boundary navigation was requested.
 */
export function isDocumentNavigationShortcut(
  event: QuireKeyboardInputEvent
): boolean {
  return event.metaKey === true || event.ctrlKey === true;
}

