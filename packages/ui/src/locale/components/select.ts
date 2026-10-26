/** Interface text of Select, supplied by the active language pack. */
export interface Messages {
  /** Trigger text while nothing is selected and no placeholder is given. */
  readonly placeholder: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = { placeholder: "请选择" };

/** English. */
export const en: Messages = { placeholder: "Select" };
