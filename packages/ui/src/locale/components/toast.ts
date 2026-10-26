/** Toast interface text. */
export interface Messages {
  /** Accessible name of each notification's close button. */
  readonly close: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = { close: "关闭通知" };

/** English. */
export const en: Messages = { close: "Dismiss notification" };
