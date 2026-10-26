import { contentMessages } from "./messages/content";
import { formattingMessages } from "./messages/formatting";
import { interactionsMessages } from "./messages/interactions";
import { objectsMessages } from "./messages/objects";
import { workspaceMessages } from "./messages/workspace";
import type { BlockTextValues } from "./types";

/** Bundled English messages, keyed by the default Chinese interface copy. */
export const blockEnglishMessages: Readonly<Record<string, string>> = {
  ...contentMessages, ...formattingMessages, ...interactionsMessages, ...objectsMessages, ...workspaceMessages,
  "界面语言": "Interface language",
  "文档": "Document",
  "正在准备文件": "Preparing files",
  ...Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`标题 ${index + 1}`, `Heading ${index + 1}`])),
  "标题 {level}": "Heading {level}",
  "删除 {count} 个块": "Delete {count} blocks",
  "{label} · 点击打开菜单，拖动调整顺序": "{label} · Click for actions, drag to reorder",
  "{label}选项": "{label} options",
  "{color}背景": "{color} background",
  "{color}文字": "{color} text",
  "{action}：{title}": "{action}: {title}",
  "输入标题，留空显示“{title}”": "Enter a title; leave blank for “{title}”",
  "原日期“{date}”无效，请重新选择": "The date “{date}” is invalid. Choose another date.",
  "{rows} 行 × {columns} 列": "{rows} rows × {columns} columns",
  "宽度应为 32–{max} px，高度应为 24–4000 px": "Width must be 32–{max} px; height must be 24–4000 px",
  "调整第 {index} 栏宽度": "Resize column {index}",
  "{action}{kind}": "{action} {kind}",
  "文件名称 {index}": "File name {index}",
  "前移图片 {index}": "Move image {index} earlier",
  "后移图片 {index}": "Move image {index} later",
  "移除文件 {index}": "Remove file {index}",
  "删除模板：{name}": "Delete template: {name}",
  "编辑{kind}": "Edit {kind}",
  "删除{kind}": "Delete {kind}",
  "{kind}快捷工具": "{kind} tools",
  "查看图片：{name}": "Preview image: {name}",
  "{value} 磅": "{value} pt",
  "{characters} 字符 · {words} 词": "{characters} characters · {words} words",
  "已替换 {count} 处，跳过 {skipped} 处": "Replaced {count}; skipped {skipped}",
  "编号 {marker}，列表操作": "Number {marker}, list actions",
  "{date}（无效日期）": "{date} (invalid date)",
  "{message}；双击编辑源码": "{message}; double-click to edit source",
  "“{name}”超过文件大小限制": "“{name}” exceeds the file size limit",
  "不支持的属性：{name}": "Unsupported attribute: {name}",
  "不支持的内容块：{type}": "Unsupported block: {type}",
  "不支持的文字格式：{type}": "Unsupported text mark: {type}"
};

/** @param locale - Product or component locale. @param source - Interface message, never authored document content. @param values - Named values. @returns Localized product copy; external extension copy is preserved. */
export function translateBlockText(locale: string, source: string, values?: BlockTextValues): string {
  const text = locale.toLowerCase().startsWith("en") ? blockEnglishMessages[source] ?? source : source;
  return values ? text.replace(/\{(\w+)\}/gu, (token, name: string) => String(values[name] ?? token)) : text;
}

const textFields = new Set(["label", "disclosureLabel", "text", "description", "disabledReason", "reason", "placeholder", "tooltip", "group"]);
const childFields = new Set(["items", "children", "options", "scopes"]);

/**
 * Projects the finite interface catalog only. Values, callbacks, canonical nodes,
 * user names and resource metadata are deliberately not traversed.
 * @param locale - Current interface language.
 * @param entries - Menu, toolbar or option projection.
 * @returns The same contract with translated presentation fields.
 */
export function localizeBlockEntries<T>(locale: string, entries: T): T {
  if (!locale.toLowerCase().startsWith("en") || entries == null) return entries;
  if (Array.isArray(entries)) return entries.map(item => localizeBlockEntries(locale, item)) as T;
  if (typeof entries !== "object") return entries;
  return Object.fromEntries(Object.entries(entries).map(([key, value]) => [key,
    textFields.has(key) && typeof value === "string" ? translateBlockText(locale, value)
      : childFields.has(key) && Array.isArray(value) ? localizeBlockEntries(locale, value) : value
  ])) as T;
}
