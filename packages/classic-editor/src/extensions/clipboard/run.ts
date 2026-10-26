import { canvasInternalClipboardMime } from "@quirekit/clipboard";
import type { ClassicEditorRenderContext } from "@classic/types";
import { createClassicEditorClipboardEvent, readClassicEditorClipboardEntries } from "./events";
import { reportClassicEditorClipboardBlocked } from "./feedback";
import { readClassicEditorSystemClipboard, writeClassicEditorSystemClipboard } from "./system";
import type { ClassicEditorClipboardOperation } from "./types";

/**
 * Runs one clipboard operation from a product menu through the editor's own
 * clipboard events, so routing for tables, fields, protected ranges and stories
 * stays identical to keyboard shortcuts.
 *
 * @param context - Mounted product context.
 * @param operation - Clipboard operation to run.
 * @returns Whether the operation completed.
 */
export async function runClassicEditorClipboardOperation(
  context: ClassicEditorRenderContext,
  operation: ClassicEditorClipboardOperation
): Promise<boolean> {
  const document = context.root.ownerDocument;
  const window = document.defaultView;
  if (window === null) return false;
  if (operation === "paste" || operation === "paste-text") {
    // Read first: the browser permission prompt may move focus away from the editor.
    const content = await readClassicEditorSystemClipboard(window, operation === "paste-text");
    if (content === null) {
      reportClassicEditorClipboardBlocked(context, operation);
      return false;
    }
    const input = focusEditorInput(context);
    if (input === null || (content.text === "" && content.html === null)) return false;
    const data = new window.DataTransfer();
    if (operation === "paste" && content.internal !== null) data.setData(canvasInternalClipboardMime, content.internal);
    if (operation === "paste" && content.html !== null) data.setData("text/html", content.html);
    data.setData("text/plain", content.text);
    return !input.dispatchEvent(createClassicEditorClipboardEvent(window, "paste", data));
  }
  const input = focusEditorInput(context);
  if (input === null) return false;
  // Capture formats without side effects, then cut only after the write succeeded.
  const captured = new window.DataTransfer();
  if (input.dispatchEvent(createClassicEditorClipboardEvent(window, "copy", captured))) return false;
  const entries = readClassicEditorClipboardEntries(captured);
  if (entries.length === 0) return false;
  if (!await writeClassicEditorSystemClipboard(document, entries)) {
    reportClassicEditorClipboardBlocked(context, operation);
    return false;
  }
  if (operation === "copy") return true;
  const discard = new window.DataTransfer();
  return !focusEditorInput(context)?.dispatchEvent(createClassicEditorClipboardEvent(window, "cut", discard));
}

/**
 * Returns native focus to the editor and resolves its input proxy.
 *
 * @param context - Mounted product context.
 * @returns Focused editor text input, or null when focus did not land on one.
 */
function focusEditorInput(context: ClassicEditorRenderContext): HTMLElement | null {
  // The focus command defers to the next frame; clipboard events need the input now.
  context.editor.view.focus();
  const active = context.root.ownerDocument.activeElement;
  return active instanceof HTMLElement && active.tagName === "TEXTAREA" ? active : null;
}
