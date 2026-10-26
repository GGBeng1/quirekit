import { querySourceBlockInsertion } from "@quirekit/msfe-core";
import type { EditorState } from "@quirekit/cm-state";
import type { MdEditorLocale } from "../../types";

const chinese = {
  readonly: "文档为只读，无法插入内容。",
  selection: "请将光标放在一个段落内，或完整选中一个块。",
  unparsed: "当前位置尚未解析完成，请稍后重试。",
  structure: "请在普通段落、空行或完整块的前后插入。",
  table: "表格单元格仅支持行内内容。可在插入菜单中选择表格前后的位置。",
  code: "代码块内部仅支持代码文本。可在插入菜单中选择代码块前后的位置。",
  list: "请使用列表操作，或在完整列表前后插入。",
  quote: "请在完整引用块前后插入，保留引用结构。",
  inline: "请将光标移出当前格式、链接或行内代码，或完整选中它。",
};
const english: Record<keyof typeof chinese, string> = {
  readonly: "This document is read-only.",
  selection: "Place the caret in one paragraph, or select a complete block.",
  unparsed: "This position is still being parsed. Try again shortly.",
  structure: "Insert in a plain paragraph, an empty line, or beside a complete block.",
  table: "Table cells support inline content only. Choose before or after the table in Insert.",
  code: "Code blocks contain code text only. Choose before or after the code block in Insert.",
  list: "Use list actions, or insert beside the complete list.",
  quote: "Insert beside the complete quote to preserve its structure.",
  inline: "Move outside the format, link or inline code, or select it completely.",
};

/** @param state - Accepted source selection. @param locale - Product language. @returns Explanation of the same structural decision used by the command, or no hint when admitted. */
export function insertionHint(state: EditorState, locale: MdEditorLocale): string | undefined {
  const { reason } = querySourceBlockInsertion(state);
  return reason ? (locale === "en" ? english : chinese)[reason] : undefined;
}

/** @param name - Complete source block kind. @param locale - Product language. @returns Explicit insertion locations, distinct from inserting a table row. */
export function adjacentInsertionLabels(name: string, locale: MdEditorLocale): { before: string; after: string } {
  const block = name === "Table" ? (locale === "en" ? "table" : "表格") : (locale === "en" ? "code block" : "代码块");
  return locale === "en" ? { before: `Insert before ${block}`, after: `Insert after ${block}` }
    : { before: `在${block}前插入`, after: `在${block}后插入` };
}
