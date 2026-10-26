/** Interface text of Cascader, supplied by the active language pack. */
export interface Messages {
  /** Accessible name of one browsing level, given the field label and its one-based depth. */
  readonly level: (label: string, depth: number) => string;
}

/** Simplified Chinese. */
export const zhCN: Messages = { level: (label, depth) => `${label}第 ${depth} 级` };

/** English. */
export const en: Messages = { level: (label, depth) => `${label} level ${depth}` };
