import type { Editor } from "@quirekit/core";
import { Fragment, TextSelection, closeHistory, type Node as PMNode } from "@quirekit/pm";
import type { BlockResource } from "../rich-content/types";
import type { BlockAttachmentQuery } from "./types";

/** @param editor - Document owner. @returns At most 128 characters around a committed inline trigger. */
export function readAttachmentQuery(editor: Editor): BlockAttachmentQuery | null {
  const { doc, selection } = editor.state.pm, { $from } = selection;
  if (!editor.isEditable || !selection.empty || !$from.parent.isTextblock || $from.parent.type.spec.code
    || !editor.state.schema.nodes.inlineAttachment) return null;
  const start = Math.max(0, $from.parentOffset - 128);
  const text = $from.parent.textBetween(start, $from.parentOffset, "\n", "\ufffc");
  const match = /(?:^|[\s（(，。])@([^@\n\ufffc]{0,120})$/u.exec(text);
  if (!match) return null;
  const query = match[1]!;
  return { doc, from: selection.from - query.length - 1, to: selection.from, query };
}

/** @param doc - Snapshot taken only when the picker opens. @returns Distinct files in document order; repeated references do not duplicate results. */
export function collectAttachmentReferences(doc: PMNode): readonly BlockResource[] {
  const found = new Map<string, BlockResource>();
  doc.descendants(node => {
    if ((node.type.name === "inlineAttachment" || node.type.name === "blockAsset") && node.attrs.kind === "attachment") {
      for (const item of node.attrs.items as BlockResource[]) if (!found.has(item.id)) found.set(item.id, item);
      return false;
    }
    return !node.isAtom;
  });
  return [...found.values()];
}

/** @param editor - Current document owner. @param target - Last committed trigger. @param resource - Existing file chosen by identity. @returns Whether one atomic inline reference replaced the trigger. */
export function insertAttachmentReference(editor: Editor, target: BlockAttachmentQuery, resource: BlockResource): boolean {
  if (!editor.isEditable || editor.isDestroyed || editor.state.doc !== target.doc) return false;
  const current = readAttachmentQuery(editor), type = editor.state.schema.nodes.inlineAttachment;
  if (!type || !current || current.from !== target.from || current.to !== target.to) return false;
  const file = collectAttachmentReferences(editor.state.doc).find(item => item.id === resource.id && item.src === resource.src);
  if (!file) return false;
  const $from = editor.state.doc.resolve(target.from), $to = editor.state.doc.resolve(target.to);
  const node = type.create({ items: [file] }, undefined, $from.marks());
  if (!$from.sameParent($to) || !$from.parent.canReplace($from.index(), $to.indexAfter(), Fragment.from(node))) return false;
  return editor.commands.command(({ tr, dispatch }) => {
    if (dispatch) {
      closeHistory(tr); tr.replaceWith(target.from, target.to, node);
      tr.setSelection(TextSelection.create(tr.doc, target.from + node.nodeSize));
    }
    return true;
  });
}
