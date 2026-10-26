import type { ClassicEditorMountedRenderable, ClassicEditorRenderContext } from "@classic/types";
import { createClassicEditorClipboardEvent } from "./events";

/**
 * Reports whether a keydown asks for a plain-text paste.
 *
 * Covers Ctrl/⌘+Shift+V and Safari's ⌥⇧⌘V by physical key; the browser still
 * performs the native paste that follows.
 *
 * @param event - Browser keydown event.
 * @returns Whether the next native paste should keep text only.
 */
export function isClassicEditorPlainTextPasteShortcut(
  event: Pick<KeyboardEvent, "key" | "code" | "shiftKey" | "ctrlKey" | "metaKey">
): boolean {
  const isV = event.code === "KeyV" || event.key.toLowerCase() === "v";
  return isV && event.shiftKey && (event.ctrlKey || event.metaKey);
}

/**
 * Turns the native paste after Ctrl/⌘+Shift+V into a text-only paste.
 *
 * The native paste is stopped in the capture phase and re-dispatched to the
 * same editor input with only `text/plain`, so the ordinary paste route runs
 * and the text takes the formatting at the insertion point.
 *
 * @param context - Mounted product context.
 * @returns Renderless controller owning the root listeners.
 */
export function mountClassicEditorPlainTextPaste(
  context: ClassicEditorRenderContext
): ClassicEditorMountedRenderable {
  let latest = context;
  let requested = false;
  const root = context.root;
  const keydown = (event: KeyboardEvent) => {
    requested = isClassicEditorPlainTextPasteShortcut(event);
  };
  const paste = (event: ClipboardEvent) => {
    const plain = requested;
    requested = false;
    const target = event.target;
    const window = root.ownerDocument.defaultView;
    if (!plain || event.clipboardData === null || window === null || !(target instanceof window.HTMLElement)
      || !latest.editor.view.dom.contains(target)) return;
    const data = new window.DataTransfer();
    data.setData("text/plain", event.clipboardData.getData("text/plain"));
    event.preventDefault();
    event.stopImmediatePropagation();
    target.dispatchEvent(createClassicEditorClipboardEvent(window, "paste", data));
  };
  root.addEventListener("keydown", keydown, true);
  root.addEventListener("paste", paste, true);
  return {
    element: null,
    update(next) { latest = next; },
    destroy() {
      root.removeEventListener("keydown", keydown, true);
      root.removeEventListener("paste", paste, true);
    }
  };
}
