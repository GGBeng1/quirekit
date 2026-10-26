/** Editable interface text. */
export interface Messages {
  /** Empty-value hint when the host gives no placeholder. */
  readonly placeholder: string;
  /** Default feedback when the host marks the field invalid without errorText. */
  readonly invalid: string;
  /** Accessible name of the edit action; label names the field. */
  readonly edit: (label: string) => string;
  /** Accessible name of the save action; label names the field. */
  readonly submit: (label: string) => string;
  /** Accessible name of the cancel action; label names the field. */
  readonly cancel: (label: string) => string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  placeholder: "点击编辑",
  invalid: "请检查输入内容",
  edit: label => `编辑${label}`,
  submit: label => `保存${label}`,
  cancel: label => `取消编辑${label}`
};

/** English. */
export const en: Messages = {
  placeholder: "Click to edit",
  invalid: "Check this value",
  edit: label => `Edit ${label}`,
  submit: label => `Save ${label}`,
  cancel: label => `Cancel editing ${label}`
};
