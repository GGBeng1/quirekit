import { isElement } from "./mount/dom";
import type { QuireDevtoolsExportScope } from "./export";
import type { QuireDevtoolsPanelTab } from "./types";

/** Supported delegated panel actions. */
export type QuireDevtoolsPanelAction =
  | "clear"
  | "close"
  | "export"
  | "fullscreen-toggle"
  | "interaction-toggle"
  | "json-collapse-all"
  | "json-copy"
  | "json-expand-all"
  | "json-toggle"
  | "tab"
  | "timeline-toggle"
  | "toggle";

/**
 * Reads a delegated panel action from an event target.
 *
 * @param target - Event target.
 * @returns Panel action, when one was clicked.
 */
export function readPanelAction(
  target: EventTarget | null
): QuireDevtoolsPanelAction | undefined {
  if (!isElement(target)) {
    return undefined;
  }

  const node = target.closest("[data-qk-devtools-action]");
  const action = node?.getAttribute("data-qk-devtools-action");

  return isPanelAction(action) ? action : undefined;
}

/**
 * Reads an export scope from a delegated panel action target.
 *
 * @param target - Event target.
 * @returns Export scope when present.
 */
export function readExportScope(
  target: EventTarget | null
): QuireDevtoolsExportScope | undefined {
  if (!isElement(target)) {
    return undefined;
  }

  const scope = target
    .closest("[data-qk-devtools-export-scope]")
    ?.getAttribute("data-qk-devtools-export-scope");

  return scope === "interactions" || scope === "recent" || scope === "slow"
    ? scope
    : undefined;
}

/**
 * Reads an entry id from a delegated panel action target.
 *
 * @param target - Event target.
 * @returns Numeric entry id when present.
 */
export function readEntryId(target: EventTarget | null): number | undefined {
  if (!isElement(target)) {
    return undefined;
  }

  const value = target
    .closest("[data-qk-devtools-entry-id]")
    ?.getAttribute("data-qk-devtools-entry-id");
  const id = value ? Number.parseInt(value, 10) : Number.NaN;

  return Number.isSafeInteger(id) ? id : undefined;
}

/**
 * Reads a tab id from an event target.
 *
 * @param target - Event target.
 * @returns Devtools tab id when present.
 */
export function readTab(
  target: EventTarget | null
): QuireDevtoolsPanelTab | undefined {
  if (!isElement(target)) {
    return undefined;
  }

  const tab = target
    .closest("[data-qk-devtools-tab]")
    ?.getAttribute("data-qk-devtools-tab");

  return tab === "document" ||
    tab === "interactions" ||
    tab === "performance" ||
    tab === "state" ||
    tab === "render"
    ? tab
    : undefined;
}

/**
 * Reads a JSON path from a tree action target.
 *
 * @param target - Event target.
 * @returns JSON tree path when present.
 */
export function readJsonPath(target: EventTarget | null): string | undefined {
  if (!isElement(target)) {
    return undefined;
  }

  return target
    .closest("[data-qk-devtools-json-path]")
    ?.getAttribute("data-qk-devtools-json-path") ?? undefined;
}

/**
 * Restores focus to the JSON search field after re-render.
 *
 * @param root - Devtools root.
 * @param cursorPosition - Cursor position to restore.
 */
export function focusJsonSearch(
  root: HTMLElement,
  cursorPosition: number
): void {
  const input = root.querySelector<HTMLInputElement>(
    "[data-qk-devtools-json-search]"
  );

  if (!input) {
    return;
  }

  input.focus();
  input.setSelectionRange(cursorPosition, cursorPosition);
}

/**
 * Checks whether a string is a supported panel action.
 *
 * @param value - Value to test.
 * @returns True when the value is a panel action.
 */
function isPanelAction(
  value: string | null | undefined
): value is QuireDevtoolsPanelAction {
  return (
    value === "clear" ||
    value === "close" ||
    value === "export" ||
    value === "fullscreen-toggle" ||
    value === "interaction-toggle" ||
    value === "json-collapse-all" ||
    value === "json-copy" ||
    value === "json-expand-all" ||
    value === "json-toggle" ||
    value === "tab" ||
    value === "timeline-toggle" ||
    value === "toggle"
  );
}
