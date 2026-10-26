/** InputNumber and InputNumberUnit interface text. */
export interface Messages {
  /** Empty numeric hint when the field has no name. */
  readonly placeholder: string;
  /** Empty numeric hint naming the host's field. */
  readonly fieldPlaceholder: (label: string) => string;
  /** Accessible name of the increment button; label names the numeric field. */
  readonly increment: (label: string) => string;
  /** Accessible name of the decrement button; label names the numeric field. */
  readonly decrement: (label: string) => string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  placeholder: "请输入数字",
  fieldPlaceholder: label => `请输入${label}`,
  increment: label => `增加${label}`,
  decrement: label => `减少${label}`
};

/** English. */
export const en: Messages = {
  placeholder: "Enter a number",
  fieldPlaceholder: label => `Enter ${label}`,
  increment: label => `Increase ${label}`,
  decrement: label => `Decrease ${label}`
};
