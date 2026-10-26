import type { ClassicEditorText } from "@classic/types";

/** Product copy owned by the Classic search panel. */
export const classicSearchText = Object.freeze({
  title: { en: "Find and replace", "zh-CN": "查找替换" },
  close: { en: "Close", "zh-CN": "关闭" },
  group: { en: "Editing", "zh-CN": "编辑" },
  find: { en: "Find", "zh-CN": "查找" },
  replace: { en: "Replace", "zh-CN": "替换" },
  findPlaceholder: { en: "Find in document", "zh-CN": "输入查找内容" },
  replacePlaceholder: { en: "Replace with", "zh-CN": "输入替换内容" },
  replaceWith: { en: "Replace with", "zh-CN": "替换为" },
  mode: { en: "Panel mode", "zh-CN": "面板模式" },
  caseSensitive: { en: "Match case", "zh-CN": "区分大小写" },
  wholeWord: { en: "Whole words only", "zh-CN": "全字匹配" },
  ignoreWidth: { en: "Ignore full/half width", "zh-CN": "忽略全/半角" },
  inSelection: { en: "Within selection", "zh-CN": "仅在选定范围内" },
  options: { en: "Search options", "zh-CN": "查找选项" },
  results: { en: "Matches", "zh-CN": "查找结果" },
  previous: { en: "Previous match", "zh-CN": "上一个" },
  next: { en: "Next match", "zh-CN": "下一个" },
  replaceOne: { en: "Replace", "zh-CN": "替换" },
  replaceAll: { en: "Replace all", "zh-CN": "全部替换" },
  idle: { en: "Press Enter to search", "zh-CN": "按 Enter 开始查找" },
  none: { en: "No matches", "zh-CN": "未找到匹配项" }
} satisfies Record<string, ClassicEditorText>);

/**
 * Formats the match counter.
 *
 * @param locale - Active locale.
 * @param count - Number of matches.
 * @param activeIndex - Zero-based active index, or -1.
 * @returns Localized status.
 */
export function formatClassicSearchCount(
  locale: string,
  count: number,
  activeIndex: number
): string {
  if (locale === "zh-CN") {
    return activeIndex >= 0 ? `第 ${activeIndex + 1} / ${count} 项` : `找到 ${count} 个匹配项`;
  }
  return activeIndex >= 0 ? `${activeIndex + 1} of ${count}` : `${count} matches`;
}

/**
 * Formats a replace-all outcome.
 *
 * @param locale - Active locale.
 * @param replaced - Replaced matches.
 * @param skipped - Matches the document refused to change.
 * @returns Localized status.
 */
export function formatClassicReplaceAll(
  locale: string,
  replaced: number,
  skipped: number
): string {
  if (locale === "zh-CN") {
    return skipped > 0 ? `已替换 ${replaced} 处，${skipped} 处不可修改已跳过` : `已替换 ${replaced} 处`;
  }
  return skipped > 0
    ? `Replaced ${replaced}; skipped ${skipped} protected`
    : `Replaced ${replaced}`;
}

/**
 * Formats the notice for matches outside the searchable region.
 *
 * @param locale - Active locale.
 * @param count - Matches the panel cannot reach.
 * @returns Localized notice.
 */
export function formatClassicExcludedNotice(locale: string, count: number): string {
  return locale === "zh-CN"
    ? `另有 ${count} 处不在查找范围内`
    : `${count} more are outside the search scope`;
}
