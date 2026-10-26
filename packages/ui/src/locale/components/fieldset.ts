/** Fieldset interface text. */
export interface Messages {
  /** Default feedback when the group is invalid without errorText. */
  readonly invalid: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  invalid: "请检查这一组设置"
};

/** English. */
export const en: Messages = {
  invalid: "Check these settings"
};
