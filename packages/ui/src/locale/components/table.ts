/** Interface text of Table, supplied by the active language pack. */
export interface Messages {
  /** Name of the table when neither label nor caption is given. */
  readonly table: string;
  /** Accessible name of the scroll region, given the table name. */
  readonly scrollArea: (name: string) => string;
  /** Loading announcement. */
  readonly loading: string;
  /** Empty-state title when no empty slot is given. */
  readonly empty: string;
  /** Accessible name of the current page's select-all checkbox. */
  readonly selectPage: string;
  /** Accessible name of a row selection checkbox, given the row's readable identity. */
  readonly selectRow: (row: string) => string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  table: "表格", scrollArea: name => `${name} · 滚动区域`, loading: "正在加载…", empty: "暂无数据",
  selectPage: "选择本页可选行", selectRow: row => `选择 ${row}`
};

/** English. */
export const en: Messages = {
  table: "Table", scrollArea: name => `${name} · scroll area`, loading: "Loading…", empty: "No data",
  selectPage: "Select all selectable rows on this page", selectRow: row => `Select ${row}`
};
