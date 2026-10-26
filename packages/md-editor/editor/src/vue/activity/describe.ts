import type { ActivityEvent } from "@quirekit/edit-history";
import { mdEditorMessages } from "../messages";
import type { MdEditorLocale } from "../types";

// Insertion identities map to the product's own block labels.
const typeLabels: Readonly<Record<string, keyof typeof mdEditorMessages["zh-CN"]>> = {
  paragraph: "paragraph", h1: "h1", h2: "h2", h3: "h3", h4: "h4", h5: "h5", h6: "h6", quote: "quote", list: "list", ordered: "ordered",
  task: "task", table: "table", code: "code", note: "note", warning: "warning", details: "details", nested: "nested", divider: "divider",
  definition: "definition", highlight: "highlightBlock", image: "image", link: "link", footnote: "footnote", inlineMath: "inlineMath",
  displayMath: "displayMath", math: "displayMath", textDiagram: "textDiagram", mermaid: "textDiagram", flowchart: "flow", mindMap: "mindmap",
  date: "date", emoji: "emoji", mention: "mention", bullet: "list",
};

const phrases = {
  "zh-CN": { edit: "编辑了正文", paste: "执行了粘贴", cut: "执行了剪切", drop: "拖入了内容", remove: "删除了内容", insert: "插入", inserted: "插入了内容",
    move: "移动了块", removeBlock: "删除了块", duplicate: "创建了副本", convert: "转换为", color: "修改了高亮块颜色", emoji: "更换了高亮块图标",
    undo: "执行了撤消", redo: "执行了重做", commentAdd: "添加了评论", commentReply: "回复了评论", commentResolve: "解决了评论", commentReopen: "重新打开了评论", commentRemove: "删除了评论",
    join: "加入协作", leave: "离开协作", version: "保存了版本", restore: "恢复了版本", import: "导入了文档", update: "更新了文档" },
  en: { edit: "Edited text", paste: "Pasted", cut: "Cut", drop: "Dropped content", remove: "Deleted text", insert: "Inserted ", inserted: "Inserted content",
    move: "Moved a block", removeBlock: "Deleted a block", duplicate: "Duplicated a block", convert: "Turned into ", color: "Changed highlight colors", emoji: "Changed highlight icon",
    undo: "Undid a change", redo: "Redid a change", commentAdd: "Added a comment", commentReply: "Replied to a comment", commentResolve: "Resolved a comment", commentReopen: "Reopened a comment", commentRemove: "Deleted a comment",
    join: "Joined", leave: "Left", version: "Saved a version", restore: "Restored a version", import: "Imported the document", update: "Updated the document" },
} as const;

/**
 * @param event - Confirmed activity event.
 * @param locale - Control language.
 * @returns One-line description; unknown kinds read as a generic document update.
 */
export function describeActivity(event: ActivityEvent, locale: MdEditorLocale): string {
  const text = phrases[locale], messages = mdEditorMessages[locale];
  /** @param type - Block or insertion identity. @returns Its product label, or undefined. */
  const label = (type: unknown): string | undefined => typeof type === "string" && typeLabels[type] ? messages[typeLabels[type]!] : undefined;
  switch (event.kind) {
    case "text.edit": return text.edit;
    case "text.paste": return text.paste;
    case "text.cut": return text.cut;
    case "text.drop": return text.drop;
    case "text.delete": return text.remove;
    case "block.insert": { const name = label(event.facts.type); return name ? `${text.insert}${name}` : text.inserted; }
    case "block.move": return text.move;
    case "block.remove": return text.removeBlock;
    case "block.duplicate": return text.duplicate;
    case "block.convert": { const name = label(event.facts.to); return name ? `${text.convert}${name}` : text.update; }
    case "md.highlight.color": return text.color;
    case "md.highlight.emoji": return text.emoji;
    case "undo": return text.undo;
    case "redo": return text.redo;
    case "comment.add": return text.commentAdd;
    case "comment.reply": return text.commentReply;
    case "comment.resolve": return text.commentResolve;
    case "comment.reopen": return text.commentReopen;
    case "comment.remove": return text.commentRemove;
    case "session.join": return text.join;
    case "session.leave": return text.leave;
    case "version.create": return named(text.version, event.facts.name, locale);
    case "version.restore": return named(text.restore, event.facts.name, locale);
    case "document.import": return text.import;
    default: return text.update;
  }
}

/** @param phrase - Action. @param name - Version name fact. @param locale - Control language. @returns The action with the quoted name, when present. */
function named(phrase: string, name: unknown, locale: MdEditorLocale): string {
  if (typeof name !== "string" || !name) return phrase;
  return locale === "zh-CN" ? `${phrase}“${name}”` : `${phrase} “${name}”`;
}
