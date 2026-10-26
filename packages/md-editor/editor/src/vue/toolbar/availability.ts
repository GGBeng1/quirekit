import { querySourceInline } from "@quirekit/msfe-core";
import type { EditorState } from "@quirekit/cm-state";
import type { MdEditorLocale } from "../types";

/** @param state - Current source selection. @param locale - UI language. @param block - Whether this changes paragraph structure. @returns A structural explanation without command planning or parsing. */
export function formattingHint(state: EditorState, locale: MdEditorLocale, block = false): string | undefined {
  const queries = state.selection.ranges.flatMap(range => block && !range.empty
    ? [querySourceInline(state, { from: range.from, to: range.from }), querySourceInline(state, { from: range.to, to: range.to })]
    : [querySourceInline(state, range)]);
  if (block && queries.some(query => query.node?.name === "TableCell")) return locale === "en"
    ? "Table cells accept inline content, not headings or lists." : "表格单元格支持行内内容，不能转换为标题或列表。";
  if (queries.every(query => !query.reason)) return undefined;
  return locale === "en" ? "Select prose within one paragraph or table cell. Code and structural syntax cannot receive text styles."
    : "请在一个段落或单元格内选择正文；代码和结构语法不能添加文字样式。";
}

/** @param locale - UI language. @returns Feedback for an atomic grammar refusal, without suggesting silent text changes. */
export function formattingRejected(locale: MdEditorLocale): string {
  return locale === "en" ? "This selection cannot express that format without changing existing Markdown. The source is unchanged. Select a complete text span or edit the source."
    : "当前选区无法无损应用该格式，原文未改动。请完整选择一段文字，或在源码中调整语法。";
}
