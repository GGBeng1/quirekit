import type { ClassicEditorLocale } from "../../../types";
import type { ClassicEditorInsertCapabilityMode } from "../../../types/insert";

const copy = {
  title: ["插入内容", "Insert content"],
  subtitle: ["选择要创建的内容；高级属性会在创建后出现", "Choose what to create; advanced properties appear after insertion"],
  search: ["搜索可插入内容", "Search insertable content"],
  searchPlaceholder: ["搜索链接、表格、图片、控件…", "Search links, tables, images, controls…"],
  recent: ["最近使用", "Recent"],
  allGroups: ["内容分类", "Content groups"],
  back: ["返回分类", "Back to groups"],
  close: ["关闭插入面板", "Close Insert"],
  empty: ["没有匹配的内容", "No matching content"],
  emptyHint: ["尝试其他名称，或选择一个内容分类。", "Try another name or choose a content group."],
  noRecent: ["成功插入过的内容会显示在这里", "Successfully inserted items appear here"],
  inserting: ["正在执行插入动作", "Running insert action"],
  failed: ["当前动作没有修改文档，请检查选区或权限", "The action made no change; check selection or permissions"],
  constrained: ["受约束", "Constrained"],
  preservedReadonly: ["仅保留", "Preserved"],
  hostMissing: ["需要宿主", "Host required"],
  unsupported: ["暂不支持", "Unsupported"]
} as const;

/** Built-in Insert surface message key. */
export type ClassicEditorInsertMessageKey = keyof typeof copy;

/**
 * Resolves one bilingual Insert surface message.
 *
 * @param locale - Mounted product locale.
 * @param key - Stable built-in message key.
 * @returns Localized visible copy.
 */
export function getClassicEditorInsertMessage(
  locale: ClassicEditorLocale,
  key: ClassicEditorInsertMessageKey
): string {
  const value = copy[key];
  return locale === "zh-CN" ? value[0] : value[1];
}

/**
 * Resolves the compact capability badge for a visible non-default disposition.
 *
 * @param locale - Mounted product locale.
 * @param mode - Resolved capability disposition.
 * @returns Localized badge copy, or null for ordinary availability.
 */
export function getClassicEditorInsertCapabilityLabel(
  locale: ClassicEditorLocale,
  mode: ClassicEditorInsertCapabilityMode
): string | null {
  if (mode === "constrained") return getClassicEditorInsertMessage(locale, "constrained");
  if (mode === "preserved-readonly") {
    return getClassicEditorInsertMessage(locale, "preservedReadonly");
  }
  if (mode === "host-missing") return getClassicEditorInsertMessage(locale, "hostMissing");
  if (mode === "unsupported") return getClassicEditorInsertMessage(locale, "unsupported");
  return null;
}
