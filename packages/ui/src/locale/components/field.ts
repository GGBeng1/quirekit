/** Field interface text. */
export interface Messages {
  /** Default feedback when the field is invalid without errorText. */
  readonly invalid: string;
  /** Default feedback while the field represents several different values. */
  readonly mixed: string;
  /** Default feedback while the field is updating. */
  readonly busy: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  invalid: "请检查此字段",
  mixed: "多个值",
  busy: "正在更新…"
};

/** English. */
export const en: Messages = {
  invalid: "Check this field",
  mixed: "Mixed values",
  busy: "Updating…"
};
