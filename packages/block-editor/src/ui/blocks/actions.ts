import { BlockSelection, type Editor } from "@quirekit/core";
import { readBlockCatalog, resolveBlockRange } from "@quirekit/extensions";
import { restoreBlockEditorFocus } from "../focus";
import type { BlockAction, BlockActionTarget } from "./types";

/**
 * Captures the current top-level block without scanning the document.
 * @param editor - Canonical editing session.
 * @param position - Optional exact block boundary captured by the gutter.
 * @returns Whole-block target, or null for unsupported/cross-block selections.
 */
export function captureBlockTarget(editor: Editor, position?: number): BlockActionTarget | null {
  const catalog = readBlockCatalog(editor);
  const selection = editor.state.pm.selection;
  const { $from, to } = selection;
  const from = position ?? ($from.depth > 0 ? $from.before(1) : $from.pos);
  const block = catalog?.byFrom.get(from);
  if (!catalog || !block) return null;
  let blocks = [block];
  if (selection instanceof BlockSelection && (position === undefined || (position >= selection.from && position < selection.to))) {
    const anchor = catalog.byFrom.get(selection.from);
    const lastSize = selection.$to.nodeBefore?.nodeSize;
    const focus = lastSize && catalog.byFrom.get(selection.to - lastSize);
    const selected = anchor && focus && resolveBlockRange(catalog, { anchor, focus, expectedDocumentRevision: catalog.revision });
    if (!selected) return null;
    blocks = [...selected];
  } else if (position === undefined && to > block.to) return null;
  const first = blocks[0]!, last = blocks.at(-1)!;
  const previousSize = editor.state.doc.resolve(first.from).nodeBefore?.nodeSize;
  return {
    block: first, blocks,
    range: { anchor: first, focus: last, expectedDocumentRevision: catalog.revision },
    previous: previousSize ? catalog.byFrom.get(first.from - previousSize) : undefined,
    next: catalog.byFrom.get(last.to)
  };
}

/**
 * Executes one owner-validated operation at the captured source.
 * @param editor - Canonical editing session.
 * @param target - Immutable menu target.
 * @param action - User's structural intent.
 * @returns Whether the operation was accepted.
 */
export function executeBlockAction(editor: Editor, target: BlockActionTarget, action: BlockAction): boolean {
  if (!editor.isEditable || editor.isDestroyed || action === "copy" || action === "cut") return false;
  const catalog = readBlockCatalog(editor);
  if (!catalog || catalog.revision !== target.range.expectedDocumentRevision || catalog.rootId !== target.block.rootId) return false;
  if (action === "delete" && target.blocks.length === 1 && target.block.node.type.name === "footnoteDefinition") {
    const removed = editor.commands.removeBlockFootnote(target.block.node.attrs.noteId);
    if (removed) restoreBlockEditorFocus(editor);
    return removed;
  }
  const chain = editor.chain().focus();
  if (action === "delete") return chain.closeHistory().selectBlockRange(target.range).deleteSelection().run();
  if (action === "up" || action === "down") {
    const adjacent = action === "up" ? target.previous : target.next;
    if (!adjacent || adjacent.blockId === target.block.blockId) return false;
    return chain.moveBlockRange({ source: target.range, destination: {
      target: adjacent, side: action === "up" ? "before" : "after", expectedDocumentRevision: catalog.revision
    } }).scrollIntoView().run();
  }
  if (action === "duplicate" && target.blocks.length > 1) return chain.closeHistory().insertContentAt(target.blocks.at(-1)!.to, target.blocks.map(block => block.node.toJSON())).run();
  return chain.insertBlockAt({
    destination: { target: action === "before" ? target.block : target.blocks.at(-1)!, side: action === "before" ? "before" : "after", expectedDocumentRevision: catalog.revision },
    ...(action === "duplicate" ? { content: target.block.node.toJSON() } : {})
  }).run();
}
