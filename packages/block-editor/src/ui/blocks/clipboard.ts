import type { Editor } from "@quirekit/core";
import { createEditorClipboardEvent, readEditorClipboardEntries, writeSystemClipboard } from "@quirekit/clipboard";
import { readBlockCatalog } from "@quirekit/extensions";
import type { BlockActionTarget } from "./types";

/**
 * Copies through the mounted input pipeline; cut happens only after persistence.
 * @param editor - Clipboard/selection owner.
 * @param target - Captured single block or continuous range.
 * @param cut - Whether to remove the source after a successful copy.
 * @returns Whether the complete operation succeeded.
 */
export async function copyBlockRange(editor: Editor, target: BlockActionTarget, cut: boolean): Promise<boolean> {
  const catalog = readBlockCatalog(editor);
  if (editor.isDestroyed || !editor.isEditable || catalog?.revision !== target.range.expectedDocumentRevision) return false;
  if (!editor.commands.selectBlockRange(target.range)) return false;
  const document = editor.view.dom.ownerDocument, window = document.defaultView;
  if (!window || typeof window.DataTransfer !== "function") return false;
  editor.view.focus();
  const input = document.activeElement;
  if (!(input instanceof window.HTMLElement) || !editor.view.dom.contains(input)) return false;
  const doc = editor.state.doc, data = new window.DataTransfer();
  if (input.dispatchEvent(createEditorClipboardEvent(window, "copy", data))) return false;
  const entries = readEditorClipboardEntries(data);
  if (!entries.length || !await writeSystemClipboard(document, entries)) return false;
  if (!cut) return true;
  // Permission UI may outlive the selection or source. Never delete new content.
  if (editor.isDestroyed || !editor.isEditable || editor.state.doc !== doc
    || !editor.commands.selectBlockRange(target.range)) return false;
  editor.view.focus();
  const cutInput = document.activeElement;
  if (!(cutInput instanceof window.HTMLElement) || !editor.view.dom.contains(cutInput)) return false;
  editor.commands.closeHistory();
  const removed = !cutInput.dispatchEvent(createEditorClipboardEvent(window, "cut", new window.DataTransfer()));
  editor.commands.closeHistory();
  return removed;
}
