import { emptyDefinition } from "../../definitions/commands";
import { openRichContent } from "../../rich-content/tasks";
import type { RichContentKind } from "../../rich-content/types";
import { openInlineContent } from "../../inline-content/tasks";
import { chooseBlockImage } from "../../media/files";
import { openBlockMath } from "../../math/tasks";
import type { Editor, QuireJSONContent, Range } from "@quirekit/core";
import { readBlockTableFeature } from "../../table/feature";
import { insertBlockDataView } from "../../data-view/open";
import { insertBlockTextDiagram } from "../../text-diagram/open";
import { insertBlockFlowchart } from "../../flowchart/open";
import { insertBlockMindMap } from "../../mind-map/open";
import { insertBlockWhiteboard } from "../../whiteboard/open";
import { executeBlockToolbarAction } from "../toolbar/actions";
import { blockInsertItems } from "./catalog";
import type { BlockSlashTarget } from "./types";
import { readBlockCatalog, resolveBlockRef, type BlockSlotRef } from "@quirekit/extensions";
import type { BlockListKind } from "../../lists/types";
import type { BlockContainerKind } from "../../containers/types";

/** @param id - Insert entry. @returns Its semantic list family, when applicable. */
function listKind(id: string): BlockListKind | null {
  return id === "orderedList" ? "ordered" : id === "bulletList" ? "bullet" : id === "taskList" ? "task" : null;
}

/** @param id - Synchronous catalog entry. @returns Canonical empty block content. */
export function createInsertContent(id: string): QuireJSONContent {
  const paragraph = { type: "paragraph" };
  if (id === "definitionList") return { type: id, content: [emptyDefinition()] };
  if (id.startsWith("container:")) return { type: "blockContainer", attrs: { kind: id.slice(10) }, content: [paragraph] };
  if (id.startsWith("heading:")) return { type: "heading", attrs: { level: Number(id.slice(8)) } };
  if (id === "bulletList" || id === "orderedList") return { type: id, content: [{ type: "listItem", content: [paragraph] }] };
  if (id === "blockquote") return { type: id, content: [paragraph] };
  return { type: id };
}

/** @param editor - Session. @param destination - Captured structural slot. @param id - Catalog identity. @returns Atomic insertion acceptance. */
export function insertAtBlockSlot(editor: Editor, destination: BlockSlotRef, id: string): boolean {
  if (!editor.isEditable || !blockInsertItems(editor, "", true).some(item => item.id === id)) return false;
  if (id === "footnoteReference") return editor.chain().focus().insertBlockFootnote({ destination }).run();
  if (id === "inlineDate" || id === "emoji") return openInlineContent(editor, id === "inlineDate" ? "date" : "emoji", { destination });
  if (id === "inlineMath" || id === "displayMath") return openBlockMath(editor, id === "displayMath", { destination });
  if (isDeferredBlockInsert(id)) {
    const catalog = readBlockCatalog(editor);
    if (!catalog || catalog.revision !== destination.expectedDocumentRevision) return false;
    const block = resolveBlockRef(catalog, destination.target);
    if (!block) return false;
    const empty = block.node.type.name === "paragraph" && block.node.content.size === 0;
    const position = destination.side === "before" ? block.from : block.to;
    return insertDeferred(editor, id, empty ? { from: block.from, to: block.to } : { from: position, to: position });
  }
  const kind = listKind(id);
  if (kind && typeof editor.commands.toggleBlockList === "function") return editor.chain().focus().insertBlockAt({ destination, replaceEmpty: true, content: { type: "paragraph" } }).toggleBlockList(kind).run();
  return editor.chain().focus().insertBlockAt({ destination, replaceEmpty: true, content: createInsertContent(id) }).run();
}

/** @param editor - Canonical session. @returns Bounded paragraph trigger or null; no full-document traversal. */
export function readSlashTarget(editor: Editor): BlockSlashTarget | null {
  const { selection, doc } = editor.state.pm;
  const { $from } = selection;
  if (!editor.isEditable || !selection.empty || $from.depth < 1 || $from.parent.type.name !== "paragraph"
    || $from.parent.content.size > 65 || $from.parentOffset !== $from.parent.content.size) return null;
  const text = $from.parent.textContent;
  if (!text.startsWith("/") || text.includes("\n")) return null;
  return { doc, from: $from.before(), to: $from.after(), text };
}

/** @param editor - Session. @param id - Catalog intent. @returns Whether an installed entry was handled. */
export function insertBlockContent(editor: Editor, id: string): boolean {
  if (!editor.isEditable || !blockInsertItems(editor).some(item => item.id === id)) return false;
  if (id.startsWith("container:")) return editor.chain().focus().setBlockContainer({ kind: id.slice(10) as BlockContainerKind }).run();
  if (isDeferredBlockInsert(id)) return insertDeferred(editor, id);
  switch (id) {
    case "footnoteReference": return editor.chain().focus().insertBlockFootnote().run();
    case "definitionList": return editor.chain().focus().insertContent(createInsertContent(id)).run();
    case "inlineMath": case "displayMath": return openBlockMath(editor, id === "displayMath");
    case "table": return editor.chain().focus().insertBlockTable({ rowCount: 3, columnCount: 3 }).run();
    default: return executeBlockToolbarAction(editor, id);
  }
}

/**
 * Replaces the trigger paragraph atomically, or captures it for a deferred formula confirmation.
 * @param editor - Session.
 * @param target - Last committed trigger snapshot.
 * @param id - Slash-enabled catalog entry.
 * @returns Whether the original target was replaced or its authoring task opened.
 */
export function acceptBlockSlash(editor: Editor, target: BlockSlashTarget, id: string): boolean {
  if (!editor.isEditable || editor.isDestroyed || editor.state.doc !== target.doc) return false;
  if (!blockInsertItems(editor, "", true).some(item => item.id === id)) return false;
  const range = { from: target.from, to: target.to };
  if (id === "footnoteReference") return editor.chain().focus().insertBlockFootnote({ range }).run();
  if (isDeferredBlockInsert(id)) return insertDeferred(editor, id, range);
  if (id === "inlineMath" || id === "displayMath") return openBlockMath(editor, id === "displayMath", { range });
  const kind = listKind(id);
  if (kind && typeof editor.commands.toggleBlockList === "function") {
    editor.commands.closeHistory?.();
    const applied = editor.chain().focus().insertContentAt(range, { type: "paragraph" }).toggleBlockList(kind).run();
    editor.commands.closeHistory?.();
    return applied;
  }
  if (id === "table") {
    const options = { rowCount: 3, columnCount: 3, position: range };
    if (!readBlockTableFeature(editor) || !editor.can().insertBlockTable(options)) return false;
    editor.commands.closeHistory?.();
    const applied = editor.chain().focus().insertBlockTable(options).run();
    editor.commands.closeHistory?.();
    return applied;
  }
  const content = createInsertContent(id);
  if (!editor.can().insertContentAt(range, content)) return false;
  editor.commands.closeHistory?.();
  const result = editor.chain().focus().insertContentAt(range, content).run();
  editor.commands.closeHistory?.();
  return result;
}

/** @param id - Catalog entry. @returns Whether focus belongs to a deferred authoring task. */
export function isDeferredBlockInsert(id: string): boolean {
  return ["columns", "template", "webCard", "embed", "attachment", "audio", "video", "imageGallery", "inlineDate", "emoji", "image", "dataView", "textDiagram", "flowchart", "mindMap", "whiteboard", "inlineMath", "displayMath"].includes(id);
}
/** @param editor - Owner. @param id - Task intent. @param range - Captured insertion boundary. @returns Task admission. */
function insertDeferred(editor: Editor, id: string, range?: Range): boolean {
  if (["columns", "template", "webCard", "embed", "attachment", "audio", "video", "imageGallery"].includes(id)) return openRichContent(editor, id as RichContentKind, range);
  switch (id) {
    case "inlineDate": case "emoji": return openInlineContent(editor, id === "inlineDate" ? "date" : "emoji", range ? { range } : {});
    case "image": return chooseBlockImage(editor, undefined, range);
    case "dataView": return insertBlockDataView(editor, range);
    case "textDiagram": return insertBlockTextDiagram(editor, range);
    case "flowchart": return insertBlockFlowchart(editor, range);
    case "mindMap": return insertBlockMindMap(editor, range);
    case "whiteboard": return insertBlockWhiteboard(editor, range);
    case "inlineMath": case "displayMath": return openBlockMath(editor, id === "displayMath", range ? { range } : {});
    default: return false;
  }
}
