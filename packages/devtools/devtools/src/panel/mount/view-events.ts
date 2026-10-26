import { isElement } from "./dom";
import { normalizeExportTopCount } from "../export";
import type { QuireDevtoolsPanelAction } from "../interaction";

/**
 * Reads a recent export count from an input event target.
 *
 * @param target - Event target.
 * @returns Normalized count when the target is the export count input.
 */
export function readExportTopCountInput(
  target: EventTarget | null
): number | undefined {
  if (!isElement(target) || !target.matches("[data-qk-devtools-export-top-count]")) {
    return undefined;
  }

  return normalizeExportTopCount(
    Number.parseInt((target as HTMLInputElement).value, 10)
  );
}

/**
 * Reads the slow-only timeline filter from an input event target.
 *
 * @param target - Input event target.
 * @returns Checked state when the target is the timeline filter.
 */
export function readTimelineSlowOnlyInput(
  target: EventTarget | null
): boolean | undefined {
  if (
    !isElement(target) ||
    !target.matches("[data-qk-devtools-timeline-slow-only]")
  ) {
    return undefined;
  }

  return (target as HTMLInputElement).checked;
}

/**
 * Checks whether a key should toggle an expandable entry row.
 *
 * @param event - Keyboard event.
 * @param action - Delegated panel action.
 * @returns True when the key should trigger an entry toggle.
 */
export function isEntryToggleKey(
  event: KeyboardEvent,
  action: QuireDevtoolsPanelAction | undefined
): action is "interaction-toggle" | "timeline-toggle" {
  return (action === "interaction-toggle" || action === "timeline-toggle") &&
    (event.key === "Enter" || event.key === " ");
}

/**
 * Checks whether a key should toggle the panel globally.
 *
 * @param event - Keyboard event.
 * @returns True when the global toggle shortcut was pressed.
 */
export function isPanelToggleShortcut(event: KeyboardEvent): boolean {
  return event.shiftKey &&
    event.altKey &&
    event.key.toLowerCase() === "d";
}

/**
 * Checks whether a key should close the open panel.
 *
 * @param event - Keyboard event.
 * @param open - Whether the panel is open.
 * @returns True when Escape should close the panel.
 */
export function isPanelCloseKey(event: KeyboardEvent, open: boolean): boolean {
  return event.key === "Escape" && open;
}
