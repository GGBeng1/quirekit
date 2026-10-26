/** Splitter interface text. */
export interface Messages {
  /** Accessible name of the handle between two panels. */
  readonly resize: (before: string, after: string) => string;
}

/** Simplified Chinese. */
export const zhCN: Messages = { resize: (before, after) => `调整${before}与${after}的空间` };

/** English. */
export const en: Messages = { resize: (before, after) => `Resize ${before} and ${after}` };
