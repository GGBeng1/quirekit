/** DateTimePicker 的界面文案。 */
export interface Messages {
  /** 打开日期时间面板按钮的可访问名称，包含字段名。 */
  readonly openPanel: (label: string) => string;
  /** 清除按钮的可访问名称。 */
  readonly clear: string;
  /** 移动端日期页签。 */
  readonly dateTab: string;
  /** 移动端时间页签。 */
  readonly timeTab: string;
  /** 移动端日期/时间页签组的可访问名称。 */
  readonly editor: (label: string) => string;
  /** 面板内日历的可访问名称。 */
  readonly calendar: (label: string) => string;
  /** 所选日期没有可用时间。 */
  readonly noTimes: string;
  /** 草稿未完整时的摘要；缺少的部分为 null。 */
  readonly draft: (date: string | null, time: string | null) => string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  openPanel: label => `打开${label}日期时间面板`,
  clear: "清除日期时间",
  dateTab: "日期",
  timeTab: "时间",
  editor: label => `${label} 编辑内容`,
  calendar: label => `${label} 日期`,
  noTimes: "当前日期没有可用时间，请调整日期或限制。",
  draft: (date, time) => `${date ?? "请选择日期"} ${time ?? "· 请选择完整时间"}`
};

/** English. */
export const en: Messages = {
  openPanel: label => `Open ${label} date and time panel`,
  clear: "Clear date and time",
  dateTab: "Date",
  timeTab: "Time",
  editor: label => `${label} editor`,
  calendar: label => `${label} date`,
  noTimes: "No times are available for this date. Adjust the date or constraints.",
  draft: (date, time) => `${date ?? "Choose a date"} ${time ?? "· Choose a complete time"}`
};
