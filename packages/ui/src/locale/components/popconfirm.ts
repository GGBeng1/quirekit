/** Popconfirm interface text. */
export interface Messages {
  /** Confirm button text when the host gives no task-specific action name. */
  readonly confirm: string;
  /** Cancel button text. */
  readonly cancel: string;
  /** Retry hint after a failed confirmation when the host gives no specific explanation. */
  readonly error: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = { confirm: "确认", cancel: "取消", error: "操作失败，请重试。" };

/** English. */
export const en: Messages = { confirm: "Confirm", cancel: "Cancel", error: "Something went wrong. Try again." };
