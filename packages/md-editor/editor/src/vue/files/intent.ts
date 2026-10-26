import { EditorSelection } from "@quirekit/cm-state";
import type { MsfeEditor } from "@quirekit/msfe-core";
import type { MdFileIntent, MdFileMode, MdImportAction } from "./types";

/** @param editor - Canonical source owner. @param mode - Explicit file action.
 * @returns An export snapshot or import guard independent of the current selection. */
export function createFileIntent(editor: MsfeEditor, mode: MdFileMode): MdFileIntent | null {
  if (mode === "wordExport" || mode === "formatExport") return { mode, anchor: null, markdown: editor.getMarkdown(), state: editor.state };
  if (editor.state.readOnly) return null;
  return { mode, markdown: "", anchor: editor.captureAnchor({ from: 0, to: editor.state.doc.length },
    { inclusiveStart: true, inclusiveEnd: true }) };
}

/** @param editor - Current source owner. @param intent - Original document guard.
 * @param markdown - Reviewed draft. @param action - Explicit whole-source replacement or end append.
 * @returns Whether the one undoable import transaction was accepted. */
export function commitFileImport(editor: MsfeEditor, intent: MdFileIntent, markdown: string, action: MdImportAction): boolean {
  const target = intent.anchor?.target();
  if (!target || editor.state.readOnly || !markdown.trim()) return false;
  return editor.run(state => {
    // File imports own document boundaries, never the editor's transient selection.
    const end = state.doc.length, from = action === "replace" ? 0 : end;
    const tail = state.sliceDoc(Math.max(0, end - 2), end);
    const separator = action === "replace" || !end || tail === "\n\n" ? "" : tail.endsWith("\n") ? "\n" : "\n\n";
    const insert = separator + markdown;
    return { changes: { from, to: end, insert }, selection: EditorSelection.cursor(from + insert.length), scrollIntoView: true };
  }, target).ok;
}
