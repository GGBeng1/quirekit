/** SelectionHandles accessible names. */
export interface Messages {
  /** Insertion handle. */
  readonly caret: string;
  /** Logically earlier range endpoint. */
  readonly start: string;
  /** Logically later range endpoint. */
  readonly end: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = { caret: "移动光标", start: "调整选区起点", end: "调整选区终点" };

/** English. */
export const en: Messages = { caret: "Move cursor", start: "Adjust selection start", end: "Adjust selection end" };
