import { translateBlockText } from "../../localization/text";
import { readBlockEditorLocale } from "../../localization/runtime";
import type { Editor, QuireJSONContent } from "@quirekit/core";
import type { Schema } from "@quirekit/pm";

/** @param value - Untrusted attribute object. @param known - Installed attribute names. @param locale - Interface language. */
function validateAttributes(value: unknown, known: Readonly<Record<string, unknown>> = {}, locale = "zh-CN"): void {
  if (value === undefined || value === null) return;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("属性必须是对象");
  for (const name of Object.keys(value)) if (!Object.hasOwn(known, name)) throw new Error(translateBlockText(locale, "不支持的属性：{name}", { name }));
}

/** @param value - Untrusted source. @param schema - Installed document model. @param locale - Interface language. */
function validateNode(value: unknown, schema: Schema, locale: string): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("文档节点必须是对象");
  const node = value as Record<string, unknown>;
  const type = typeof node.type === "string" ? schema.nodes[node.type] : undefined;
  if (!type) throw new Error(translateBlockText(locale, "不支持的内容块：{type}", { type: String(node.type) }));
  validateAttributes(node.attrs, type.spec.attrs, locale);
  if (node.marks !== undefined && !Array.isArray(node.marks)) throw new Error("文字格式必须是数组");
  for (const mark of (node.marks ?? []) as Record<string, unknown>[]) {
    if (!mark || typeof mark !== "object" || Array.isArray(mark)) throw new Error("文字格式必须是对象");
    const markType = typeof mark.type === "string" ? schema.marks[mark.type] : undefined;
    if (!markType) throw new Error(translateBlockText(locale, "不支持的文字格式：{type}", { type: String(mark.type) }));
    validateAttributes(mark.attrs, markType.spec.attrs, locale);
  }
  if (node.content !== undefined && !Array.isArray(node.content)) throw new Error("块内容必须是数组");
  for (const child of (node.content ?? []) as unknown[]) validateNode(child, schema, locale);
}

/** @param editor - Session. @param title - Host title. @returns Portable canonical backup, serialized only at explicit export. */
export function exportBlockBackup(editor: Editor, title: string): string {
  return JSON.stringify({ format: "quirekit-block", version: 1, title, document: editor.getJSON() }, null, 2);
}

/**
 * Checks a backup completely before invoking the canonical replacement command.
 * @param editor - Session.
 * @param source - JSON source or raw canonical document.
 * @returns Restored title when supplied, otherwise undefined.
 */
export function importBlockBackup(editor: Editor, source: string): string | undefined {
  if (!editor.isEditable) throw new Error("阅读模式下不能导入");
  const parsed = JSON.parse(source) as Record<string, unknown>;
  const envelope = parsed?.format === "quirekit-block";
  if (envelope && parsed.version !== 1) throw new Error("不支持的文档备份版本");
  const content = envelope ? parsed.document : parsed;
  validateNode(content, editor.state.schema, readBlockEditorLocale(editor));
  const node = editor.state.schema.nodeFromJSON(content);
  if (node.type !== editor.state.schema.topNodeType) throw new Error("备份必须包含完整文档");
  node.check();
  editor.commands.closeHistory?.();
  const applied = editor.chain().replaceDocument(content as QuireJSONContent, { errorOnInvalidContent: true }).setMeta("addToHistory", true).run();
  editor.commands.closeHistory?.();
  if (!applied) throw new Error("文档无法导入");
  return envelope && typeof parsed.title === "string" ? parsed.title : undefined;
}

/** @param editor - Session. @param source - Plain text source. @returns Whether canonical paragraphs were inserted. */
export function importBlockText(editor: Editor, source: string): boolean {
  if (!editor.isEditable) return false;
  editor.commands.closeHistory?.();
  const applied = editor.commands.setContent({ type: "doc", content: source.replace(/\r\n?/g, "\n").split("\n").map(text => ({
    type: "paragraph", ...(text ? { content: [{ type: "text", text }] } : {})
  })) }, { errorOnInvalidContent: true });
  editor.commands.closeHistory?.();
  return applied;
}
