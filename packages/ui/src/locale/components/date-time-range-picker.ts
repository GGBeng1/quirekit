/** DateTimeRangePicker 的界面文案。 */
export interface Messages {
  /** 打开日期时间面板按钮的可访问名称，包含字段名。 */
  readonly openPanel: (label: string) => string;
  /** 清除整个范围按钮的可访问名称。 */
  readonly clear: string;
  /** 未提供 startLabel 时开始字段的名称。 */
  readonly startField: (label: string) => string;
  /** 未提供 endLabel 时结束字段的名称。 */
  readonly endField: (label: string) => string;
  /** 移动端开始端点选项。 */
  readonly start: string;
  /** 移动端结束端点选项。 */
  readonly end: string;
  /** 移动端端点切换的可访问名称。 */
  readonly endpointSwitch: (label: string) => string;
  /** 当前端点没有可用时间。 */
  readonly noTimes: string;
  /** 两端尚未完整。 */
  readonly incomplete: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  openPanel: label => `打开${label}日期时间面板`,
  clear: "清除日期时间范围",
  startField: label => `${label} 开始时间`,
  endField: label => `${label} 结束时间`,
  start: "开始",
  end: "结束",
  endpointSwitch: label => `${label} 编辑端点`,
  noTimes: "当前端点没有可用时间，请调整日期或限制。",
  incomplete: "请选择完整起止日期时间，再确认范围。"
};

/** English. */
export const en: Messages = {
  openPanel: label => `Open ${label} date and time panel`,
  clear: "Clear date-time range",
  startField: label => `${label} start time`,
  endField: label => `${label} end time`,
  start: "Start",
  end: "End",
  endpointSwitch: label => `${label} endpoint`,
  noTimes: "No times are available. Adjust this date or constraints.",
  incomplete: "Choose both complete date-times before confirming."
};
