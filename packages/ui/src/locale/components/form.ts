/** Form and SchemaForm interface text. */
export interface Messages {
  /** Submission feedback when a save fails without a readable message. */
  readonly submitFailed: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  submitFailed: "提交失败，请重试"
};

/** English. */
export const en: Messages = {
  submitFailed: "Submission failed. Try again."
};
