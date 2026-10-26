import type { CommandSpec } from "../types";
import { isMacOS, isiOS } from "../utilities";

/**
 * Triggers a named keyboard shortcut through editor props.
 *
 * @param context - Current command execution context.
 * @param name - Tiptap keymap name such as `Mod-b`.
 * @returns Whether any key handler accepted the shortcut.
 */
export const keyboardShortcut: CommandSpec = (name) => (context) => {
  if (typeof name !== "string" || typeof KeyboardEvent === "undefined") {
    return false;
  }

  const event = createKeyboardEvent(name);
  const capturedTransaction = context.editor.captureTransaction(() => {
    context.editor.view.someProp("handleKeyDown", (handler) =>
      handler(context.editor.view, event)
    );
  });

  for (const step of capturedTransaction?.steps ?? []) {
    const mappedStep = step.map(context.tr.mapping);

    if (mappedStep) {
      context.tr.maybeStep(mappedStep);
    }
  }

  if ((capturedTransaction?.steps.length ?? 0) > 0) {
    context.dispatch?.(context.tr);
  }

  return true;
};

/**
 * Creates a keyboard event from a Tiptap keymap string.
 *
 * @param name - Tiptap keymap name such as `Mod-b`.
 * @returns Keyboard event for the keymap name.
 */
function createKeyboardEvent(name: string): KeyboardEvent {
  const parts = normalizeKeyName(name).split(/-(?!$)/);
  const key = parts.find((part) => !["Alt", "Ctrl", "Meta", "Shift"].includes(part)) ?? "";

  return new KeyboardEvent("keydown", {
    key: key === "Space" ? " " : key,
    altKey: parts.includes("Alt"),
    ctrlKey: parts.includes("Ctrl"),
    metaKey: parts.includes("Meta"),
    shiftKey: parts.includes("Shift"),
    bubbles: true,
    cancelable: true
  });
}

/**
 * Normalizes a Tiptap shortcut name to platform-specific modifier names.
 *
 * @param name - Tiptap shortcut name.
 * @returns Shortcut name using Alt/Ctrl/Meta/Shift modifiers.
 */
function normalizeKeyName(name: string): string {
  const parts = name.split(/-(?!$)/);
  let result = parts.at(-1) ?? "";
  let alt = false;
  let ctrl = false;
  let meta = false;
  let shift = false;

  if (result === "Space") {
    result = " ";
  }

  for (const modifier of parts.slice(0, -1)) {
    if (/^(cmd|meta|m)$/i.test(modifier)) {
      meta = true;
    } else if (/^a(lt)?$/i.test(modifier)) {
      alt = true;
    } else if (/^(c|ctrl|control)$/i.test(modifier)) {
      ctrl = true;
    } else if (/^s(hift)?$/i.test(modifier)) {
      shift = true;
    } else if (/^mod$/i.test(modifier)) {
      if (isiOS() || isMacOS()) {
        meta = true;
      } else {
        ctrl = true;
      }
    } else {
      throw new Error(`Unrecognized modifier name: ${modifier}`);
    }
  }

  return [
    ...(alt ? ["Alt"] : []),
    ...(ctrl ? ["Ctrl"] : []),
    ...(meta ? ["Meta"] : []),
    ...(shift ? ["Shift"] : []),
    result
  ].join("-");
}
