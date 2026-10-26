import type { Editor } from "@quirekit/core";
import { NodeSelection } from "@quirekit/pm";
import type { InlineContentRequest, InlineContentTarget } from "./types";
const hosts = new WeakMap<Editor, (request: InlineContentRequest) => void>();
/** @param editor - Canonical owner. @param open - Mounted authoring surface. @returns Host release. */
export function registerInlineContentHost(editor: Editor, open: (request: InlineContentRequest) => void): () => void {
  hosts.set(editor, open); return () => { if (hosts.get(editor) === open) hosts.delete(editor); };
}
/** @param editor - Canonical owner. @param kind - Requested field. @param target - Optional retained insertion source. @returns Whether a draft opened without mutation. */
export function openInlineContent(editor: Editor, kind: InlineContentRequest["kind"], target: InlineContentTarget = {}): boolean {
  const open = hosts.get(editor); if (!open || !editor.isEditable || editor.isDestroyed || typeof editor.commands.applyBlockInlineContent !== "function") return false;
  const doc = editor.state.doc, position = target.position;
  const node = position !== undefined && position >= 0 && position < doc.content.size ? doc.nodeAt(position) : null;
  if (position !== undefined && node?.type.name !== "inlineDate") return false;
  open({ doc, kind, range: position !== undefined ? { from: position, to: position + 1 } : target.range ?? { from: editor.state.pm.selection.from, to: editor.state.pm.selection.to },
    value: node?.attrs.date ?? "", ...(position === undefined ? {} : { position }), ...(target.destination ? { destination: target.destination } : {}) });
  return true;
}

/** @param editor - Canonical owner. @returns Whether the selected date opened without a text mutation. */
export function openSelectedInlineDate(editor: Editor): boolean {
  const selection = editor.state.pm.selection;
  return selection instanceof NodeSelection && selection.node.type.name === "inlineDate"
    && openInlineContent(editor, "date", { position: selection.from });
}
