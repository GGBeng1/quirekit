import type { Editor, Range } from "@quirekit/core";
import type { RichContentKind, RichContentRequest } from "./types";
const hosts = new WeakMap<Editor, (request: RichContentRequest) => void>();
/** @param editor - Owner. @param open - UI adapter. @returns Idempotent release. */
export function registerRichContentHost(editor: Editor, open: (request: RichContentRequest) => void): () => void {
  hosts.set(editor, open);
  return () => { if (hosts.get(editor) === open) hosts.delete(editor); };
}
/** @param editor - Owner. @param kind - Task. @param range - Original insertion range. @param position - Existing block boundary. @returns Whether a task was opened. */
export function openRichContent(editor: Editor, kind: RichContentKind, range?: Range, position?: number): boolean {
  const host = hosts.get(editor);
  if (!host || !editor.isEditable || editor.isDestroyed) return false;
  if (position !== undefined && (!Number.isInteger(position) || position < 0 || position >= editor.state.doc.content.size)) return false;
  const doc = editor.state.doc, node = position === undefined ? undefined : doc.nodeAt(position);
  if (position !== undefined && !node) return false;
  host({ doc, kind, range: node ? { from: position!, to: position! + node.nodeSize } : range ?? { from: editor.state.pm.selection.from, to: editor.state.pm.selection.to }, ...(node ? { node } : {}) });
  return true;
}
