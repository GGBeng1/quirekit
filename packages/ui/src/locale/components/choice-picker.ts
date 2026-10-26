/** ChoicePicker interface text. */
export interface Messages {
  /** Cancel button. */
  readonly cancel: string;
  /** Confirm button when the host gives no task-specific action name. */
  readonly confirm: string;
  /** Retry button after a failed submission. */
  readonly retry: string;
  /** Accessible name of the header close button. */
  readonly close: string;
  /** Label of the search field. */
  readonly search: string;
  /** Submission failure fallback when the host gives no specific explanation. */
  readonly error: string;
  /** Some newly chosen options disappeared before submission. */
  readonly invalid: string;
  /** Progress while the selection is submitted. */
  readonly submitting: string;
  /** Status line while the host loads options. */
  readonly loading: string;
  /** Some selected values have no matching option and are kept as they are. */
  readonly unknown: string;
  /** Number of selected options. */
  readonly selected: (count: number) => string;
  /** Empty list while options are loading. */
  readonly loadingOptions: string;
  /** Empty list when nothing matches the query. */
  readonly noMatches: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  cancel: "取消", confirm: "完成", retry: "重试", close: "关闭", search: "搜索选项", error: "操作未完成，请重试",
  invalid: "部分新增选项已不可用，请重新选择", submitting: "正在提交…", loading: "正在加载…",
  unknown: "部分已选值暂无对应选项，原值已保留", selected: count => `已选择 ${count} 项`,
  loadingOptions: "正在加载选项…", noMatches: "没有匹配的选项"
};

/** English. */
export const en: Messages = {
  cancel: "Cancel", confirm: "Done", retry: "Retry", close: "Close", search: "Search options",
  error: "Couldn't complete the action. Try again.", invalid: "Some new choices are no longer available. Choose again.",
  submitting: "Submitting…", loading: "Loading…", unknown: "Some selected values have no matching option and are kept as is.",
  selected: count => `${count} selected`, loadingOptions: "Loading options…", noMatches: "No matching options"
};
