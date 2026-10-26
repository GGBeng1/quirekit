/** PresetPicker interface text; the empty gallery uses PresetGallery's text. */
export interface Messages {
  /** Cancel button. */
  readonly cancel: string;
  /** Confirm button when the host gives no task-specific action name. */
  readonly confirm: string;
  /** Retry button after a failed submission. */
  readonly retry: string;
  /** Accessible name of the header close button. */
  readonly close: string;
  /** Submission failure fallback when the host gives no specific explanation. */
  readonly error: string;
  /** The chosen preset disappeared before submission. */
  readonly invalid: string;
  /** Progress while the selection is submitted. */
  readonly submitting: string;
  /** The selected value has no matching preset and is kept as it is. */
  readonly unknown: string;
  /** A preset is selected. */
  readonly selected: string;
  /** No preset is selected yet. */
  readonly none: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  cancel: "取消", confirm: "完成", retry: "重试", close: "关闭", error: "操作未完成，请重试",
  invalid: "当前预设已不可用，请重新选择", submitting: "正在提交…", unknown: "已选预设暂无对应选项，原值已保留",
  selected: "已选择预设", none: "尚未选择预设"
};

/** English. */
export const en: Messages = {
  cancel: "Cancel", confirm: "Done", retry: "Retry", close: "Close", error: "Couldn't complete the action. Try again.",
  invalid: "This preset is no longer available. Choose again.", submitting: "Submitting…",
  unknown: "The selected preset has no matching option and is kept as is.", selected: "Preset selected", none: "No preset selected"
};
