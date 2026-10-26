/** Interface text of TreeSelect, supplied by the active language pack. */
export interface Messages {
  /** Separator between selected node names in the field. */
  readonly separator: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = { separator: "、" };

/** English. */
export const en: Messages = { separator: ", " };
