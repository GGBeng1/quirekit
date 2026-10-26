/** ActionSheet interface text. */
export interface Messages {
  /** Cancel button. */
  readonly cancel: string;
  /** Progress message while the host handles a selected action. */
  readonly busy: string;
  /** Explanation when no actions are available. */
  readonly empty: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = { cancel: "取消", busy: "正在处理…", empty: "暂无可用操作" };

/** English. */
export const en: Messages = { cancel: "Cancel", busy: "Working…", empty: "No actions available" };
