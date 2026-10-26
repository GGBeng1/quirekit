/** CommandPalette interface text. */
export interface Messages {
  /** Search field hint when the host gives none. */
  readonly placeholder: string;
  /** Announcement while results load. */
  readonly loading: string;
  /** Announcement while a command runs. */
  readonly busy: string;
  /** Empty result heading. */
  readonly empty: string;
  /** Empty result guidance. */
  readonly emptyHint: string;
  /** Recovery action after a failed search. */
  readonly retry: string;
  /** Accessible name of the clear-query button. */
  readonly clear: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  placeholder: "搜索命令…", loading: "正在搜索…", busy: "正在执行…", empty: "没有匹配的命令",
  emptyHint: "换个关键词，或清除搜索查看全部命令。", retry: "重新搜索", clear: "清除搜索"
};

/** English. */
export const en: Messages = {
  placeholder: "Search commands…", loading: "Searching…", busy: "Running…", empty: "No matching commands",
  emptyHint: "Try another keyword, or clear the search to see all commands.", retry: "Search again", clear: "Clear search"
};
