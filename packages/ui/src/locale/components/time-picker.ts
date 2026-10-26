/** TimePicker 的界面文案。 */
export interface Messages {
  /** 打开时间面板按钮的可访问名称，包含字段名。 */
  readonly openPanel: (label: string) => string;
  /** 限制下没有任何可用时间。 */
  readonly noTimes: string;
  /** 草稿时间尚未完整。 */
  readonly incomplete: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  openPanel: label => `打开${label}时间面板`,
  noTimes: "没有符合条件的时间，请调整限制。",
  incomplete: "请选择完整时间"
};

/** English. */
export const en: Messages = {
  openPanel: label => `Open ${label} time panel`,
  noTimes: "No available times. Adjust the constraints.",
  incomplete: "Select a complete time"
};
