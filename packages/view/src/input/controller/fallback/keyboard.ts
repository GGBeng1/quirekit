import { TextSelection, canSplit } from "@quirekit/pm";
import { dispatchFallbackDelete } from "./delete";
import type { DispatchCanvasFallbackKeyOptions } from "./types";

/**
 * Handles editing keys that normally rely on browser DOM editing.
 * @param options - Editor, event, and dispatch callbacks.
 * @returns Whether a fallback handled the key.
 */
export function dispatchQuireFallbackKey(options: DispatchCanvasFallbackKeyOptions): boolean {
  switch (options.event.key) {
    case "Backspace":
      return dispatchFallbackDelete(options, "backward");
    case "Delete":
      return dispatchFallbackDelete(options, "forward");
    case "Enter":
      return insertParagraph(options);
    case "ArrowLeft":
    case "ArrowRight":
    case "ArrowUp":
    case "ArrowDown":
    case "Home":
    case "End":
    case "PageUp":
    case "PageDown":
      return options.dispatchKeyboardSelection(options.event);
    default:
      return false;
  }
}

/**
 * Splits the current text block when PM keymaps do not handle Enter.
 * @param options - Editor and transaction dispatcher.
 * @returns Whether a paragraph split was applied.
 */
function insertParagraph(options: DispatchCanvasFallbackKeyOptions): boolean {
  const { selection, tr } = options.editor.state.pm;
  if (!(selection instanceof TextSelection) || !selection.$from.parent.isTextblock) return false;
  if (!canSplit(options.editor.state.doc, selection.from)) return false;
  options.dispatchTransaction(tr.split(selection.from));
  return true;
}
