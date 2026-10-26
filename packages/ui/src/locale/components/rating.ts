/** Rating interface text. */
export interface Messages {
  /** Visible and accessible name of the clear action. */
  readonly clear: string;
  /** Readable committed score; zero means no rating. */
  readonly value: (value: number, count: number) => string;
  /** Accessible name of the star representing a score. */
  readonly item: (value: number, count: number) => string;
}

/** @param count - Score. @returns Score with an English plural of "star". */
function stars(count: number): string {
  return `${count} ${count === 1 ? "star" : "stars"}`;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  clear: "清除评分",
  value: (value, count) => value > 0 ? `${value} / ${count} 分` : "未评分",
  item: (value, count) => `${value} 分，共 ${count} 分`
};

/** English. */
export const en: Messages = {
  clear: "Clear rating",
  value: (value, count) => value > 0 ? `${value} / ${count}` : "Not rated",
  item: (value, count) => `${stars(value)} of ${count}`
};
