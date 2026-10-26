/** FormField interface text. */
export interface Messages {
  /** Required-value feedback when the field gives no requiredMessage; label names the field. */
  readonly required: (label: string) => string;
  /** Feedback when a validation rule throws instead of returning a result. */
  readonly validationFailed: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  required: label => `请填写${label}`,
  validationFailed: "校验失败，请重试"
};

/** English. */
export const en: Messages = {
  required: label => `Enter ${label}`,
  validationFailed: "Validation failed. Try again."
};
