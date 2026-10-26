/** Interface text of Transfer, supplied by the active language pack. */
export interface Messages {
  /** Default overall label. */
  readonly label: string;
  /** Default name of the available-member list. */
  readonly source: string;
  /** Default name of the selected-member list. */
  readonly target: string;
  /** Move selected source members into the target. */
  readonly add: string;
  /** Move selected target members back to the source. */
  readonly remove: string;
  /** Accessible name of a side's search input, given the side name. */
  readonly search: (side: string) => string;
  /** Search input placeholder. */
  readonly searchPlaceholder: string;
  /** Screen-reader prefix of the select-all checkbox, read before the visible side name. */
  readonly selectAll: string;
  /** Accessible name of a side's select-all checkbox, given the side name. */
  readonly selectAllSide: (side: string) => string;
  /** A list has no members. */
  readonly empty: string;
  /** A search has no matching members. */
  readonly noResults: string;
  /** Explains preserved target keys absent from the current item data. */
  readonly unavailable: (count: number) => string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  label: "成员选择", source: "待选", target: "已选", add: "加入", remove: "移回",
  search: side => `搜索${side}`, searchPlaceholder: "搜索名称或说明",
  selectAll: "全选", selectAllSide: side => `全选${side}`,
  empty: "暂无选项", noResults: "没有匹配结果", unavailable: count => `${count} 项暂不在候选列表中`
};

/** English. */
export const en: Messages = {
  label: "Member selection", source: "Available", target: "Selected", add: "Add", remove: "Remove",
  search: side => `Search ${side}`, searchPlaceholder: "Search names or descriptions",
  selectAll: "Select all ", selectAllSide: side => `Select all ${side}`,
  empty: "No options", noResults: "No matches",
  unavailable: count => `${count} ${count === 1 ? "item is" : "items are"} not in the current list`
};
