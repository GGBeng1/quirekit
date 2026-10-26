/** ActionMenu interface text, shared by its desktop menu and bottom task. */
export interface Messages {
  /** Accessible directory query label. */
  readonly search: string;
  /** Visible query prompt, separate from the accessible field label. */
  readonly searchPlaceholder: string;
  /** Cancel button of the bottom task. */
  readonly cancel: string;
  /** Progress message while an action runs. */
  readonly busy: string;
  /** Explanation for an empty action directory. */
  readonly empty: string;
  /** Failure fallback when the host gives no specific explanation. */
  readonly error: string;
  /** Returns to the parent directory in the bottom task. */
  readonly back: string;
  /** Accessible name of the bottom task's close button. */
  readonly close: string;
  /** Announcement after the host replaces the current directory. */
  readonly directoryUpdated: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  search: "搜索操作", searchPlaceholder: "搜索操作…", cancel: "取消", busy: "正在处理…", empty: "暂无可用操作", error: "操作未完成，请重试",
  back: "返回", close: "关闭", directoryUpdated: "操作目录已更新"
};

/** English. */
export const en: Messages = {
  search: "Search actions", searchPlaceholder: "Search actions…", cancel: "Cancel", busy: "Working…", empty: "No actions available", error: "Couldn't complete the action. Try again.",
  back: "Back", close: "Close", directoryUpdated: "Actions updated"
};
