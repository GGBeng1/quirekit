/** Interface text shared by the hierarchy fields Cascader and TreeSelect, supplied by the active language pack. */
export interface Messages {
  /** Field text while nothing is selected and no placeholder is given. */
  readonly placeholder: string;
  /** Accessible name of the field trigger, given the field label and its current text. */
  readonly trigger: (label: string, value: string) => string;
  /** Accessible name of the clear action, given the field label. */
  readonly clear: (label: string) => string;
  /** Accessible name of the search input, given the field label. */
  readonly search: (label: string) => string;
  /** Search input hint when no search placeholder is given. */
  readonly searchPlaceholder: string;
  /** Accessible name of the search result list, given the field label. */
  readonly searchResults: (label: string) => string;
  /** Shown when the search matches nothing. */
  readonly noMatches: string;
  /** Shown when the hierarchy has no nodes. */
  readonly empty: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  placeholder: "请选择", trigger: (label, value) => `${label}: ${value}`, clear: label => `清空${label}`,
  search: label => `搜索${label}`, searchPlaceholder: "搜索名称或完整路径", searchResults: label => `${label}搜索结果`,
  noMatches: "没有匹配的选项", empty: "暂无选项"
};

/** English. */
export const en: Messages = {
  placeholder: "Select", trigger: (label, value) => `${label}: ${value}`, clear: label => `Clear ${label}`,
  search: label => `Search ${label}`, searchPlaceholder: "Search names or full paths", searchResults: label => `${label} search results`,
  noMatches: "No matching options", empty: "No options"
};
