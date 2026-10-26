/** Interface text of Listbox, supplied by the active language pack. */
export interface Messages {
  /** Shown when the list has no options and no empty slot is given. */
  readonly empty: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = { empty: "暂无选项" };

/** English. */
export const en: Messages = { empty: "No options" };
