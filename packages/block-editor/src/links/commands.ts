import type { Editor } from "@quirekit/core";
import { TextSelection } from "@quirekit/pm";
import { getLinkRange, normalizeLinkAuthoringHref, normalizeLinkDisplayText, normalizeLinkHref } from "@quirekit/extension-link";
import type { BlockLinkTarget } from "./types";
import { readWebMetadata } from "../web-card/metadata";

/** @param editor - Canonical session. @returns Current complete link or text insertion target. */
export function captureBlockLink(editor: Editor): BlockLinkTarget | null {
  const { doc, selection, schema } = editor.state.pm;
  if (!(selection instanceof TextSelection) || !schema.marks.link || !selection.$from.parent.inlineContent) return null;
  const range = getLinkRange(editor.state.pm);
  const { from, to } = range ?? selection;
  const content = doc.slice(from, to).content;
  let textEditable = selection.$from.sameParent(selection.$to);
  content.forEach(node => { if (!node.isText) textEditable = false; });
  return { doc, selection, range, text: doc.textBetween(from, to, "\n", "\n"), textEditable, editable: editor.isEditable };
}

/** @param editor - Current session. @param target - Frozen task source. @returns Whether the same source and permission remain authoritative. */
export function isBlockLinkCurrent(editor: Editor, target: BlockLinkTarget): boolean {
  return !editor.isDestroyed && editor.state.doc === target.doc
    && editor.state.pm.selection.eq(target.selection) && editor.isEditable === target.editable;
}

/**
 * Applies a form through existing typed commands, preserving runs unless the label was explicitly changed.
 * @param editor - Canonical session.
 * @param target - Frozen source, never restored over a newer selection.
 * @param address - User-entered destination.
 * @param label - User-entered display text.
 * @returns Whether the atomic edit was accepted.
 */
export function applyBlockLink(editor: Editor, target: BlockLinkTarget, address: string, label: string): boolean {
  if (!editor.isEditable || !isBlockLinkCurrent(editor, target)) return false;
  const href = address === target.range?.href ? normalizeLinkHref(address) : normalizeLinkAuthoringHref(address);
  const renamed = label !== target.text;
  if (!href || (renamed && !target.textEditable)) return false;
  const text = renamed || target.selection.empty && !target.range ? normalizeLinkDisplayText(label, href) : undefined;
  if (text === null) return false;
  const chain = editor.chain().closeHistory();
  if (target.range) {
    chain.updateLink({ href, ...(text === undefined ? {} : { text }) });
    const previous = target.doc.nodeAt(target.range.from)?.marks.find(mark => mark.type.name === "link");
    const metadata = readWebMetadata(previous?.attrs.web);
    // Editing the label keeps same-destination card information. Changing the
    // destination intentionally drops metadata that belongs to the old website.
    if (metadata?.url === href) chain.setTextSelection({ from: target.range.from, to: target.range.from + (text ?? target.text).length })
      .setMark("link", { href, web: { ...metadata, ...(renamed ? { title: text } : {}) } });
    return chain.run();
  }
  if (target.selection.empty) return chain.insertLink({ href, text: text ?? href }).run();
  if (!renamed) return chain.setLink({ href }).run();
  const type = editor.state.schema.marks.link!;
  const marks = type.create({ href }).addToSet(type.removeFromSet(target.doc.slice(target.selection.from, target.selection.to).content.firstChild?.marks ?? []));
  if (!type.isInSet(marks)) return false;
  return chain.insertContentAt({ from: target.selection.from, to: target.selection.to }, editor.state.schema.text(text!, marks)).run();
}

/** @param editor - Canonical session. @param target - One captured occurrence. @returns Whether only its link mark was removed. */
export function removeBlockLink(editor: Editor, target: BlockLinkTarget): boolean {
  if (!target.range || !editor.isEditable || !isBlockLinkCurrent(editor, target)) return false;
  return editor.chain().closeHistory().setTextSelection(target.range).unsetLink().run();
}
