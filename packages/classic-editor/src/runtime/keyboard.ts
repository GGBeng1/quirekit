import type { ClassicEditorKeyboardShortcut } from "../types";

/**
 * Finds the command bound to a browser keyboard event.
 *
 * @param event - Browser keyboard event.
 * @param shortcuts - Normalized product shortcuts.
 * @returns Matching shortcut, or undefined.
 */
export function findClassicEditorShortcut(
  event: KeyboardEvent,
  shortcuts: readonly ClassicEditorKeyboardShortcut[]
): ClassicEditorKeyboardShortcut | undefined {
  return shortcuts.find((shortcut) => matchesShortcut(event, shortcut.shortcut));
}

/**
 * Matches one normalized shortcut against a browser event.
 *
 * @param event - Browser keyboard event.
 * @param shortcut - Normalized shortcut signature.
 * @returns Whether the event matches.
 */
function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = new Set(shortcut.split("-"));
  const key = shortcut.split("-").at(-1);
  const hasMod = parts.has("mod");
  const modMatches = hasMod ? event.metaKey || event.ctrlKey : !event.metaKey && !event.ctrlKey;
  return modMatches
    && event.shiftKey === parts.has("shift")
    && event.altKey === parts.has("alt")
    && event.key.toLowerCase() === key;
}
