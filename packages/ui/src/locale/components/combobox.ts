/** Interface text of Combobox, supplied by the active language pack. */
export interface Messages {
  /** Input hint while empty and no placeholder is given. */
  readonly placeholder: string;
  /** Shown when no option matches and no empty slot is given. */
  readonly empty: string;
  /** Shown while results load and no loading slot is given. */
  readonly loading: string;
  /** Accessible name of the clear action. */
  readonly clear: string;
  /** Accessible name of the open-list action. */
  readonly open: string;
  /** Native validation message when a required value is missing. */
  readonly required: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  placeholder: "搜索或选择", empty: "没有匹配结果", loading: "正在加载…",
  clear: "清除选择", open: "展开选项", required: "请选择一项。"
};

/** English. */
export const en: Messages = {
  placeholder: "Search or select", empty: "No matches", loading: "Loading…",
  clear: "Clear selection", open: "Show options", required: "Select an item."
};
