/** Alert interface text. */
export interface Messages {
  /** Accessible name of the close button. */
  readonly close: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = { close: "关闭提示" };

/** English. */
export const en: Messages = { close: "Dismiss alert" };
