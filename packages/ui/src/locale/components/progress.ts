/** Progress interface text. */
export interface Messages {
  /** Value text while progress is indeterminate. */
  readonly indeterminate: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = { indeterminate: "处理中" };

/** English. */
export const en: Messages = { indeterminate: "Processing" };
