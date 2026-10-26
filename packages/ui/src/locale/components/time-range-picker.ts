/** TimeRangePicker 的界面文案。 */
export interface Messages {
  /** 打开时间面板按钮的可访问名称，包含字段名。 */
  readonly openPanel: (label: string) => string;
  /** 清除整个范围按钮的可访问名称。 */
  readonly clear: string;
  /** 未提供 startLabel 时开始字段的名称。 */
  readonly startField: (label: string) => string;
  /** 未提供 endLabel 时结束字段的名称。 */
  readonly endField: (label: string) => string;
  /** 移动端开始端点页签。 */
  readonly start: string;
  /** 移动端结束端点页签。 */
  readonly end: string;
  /** 当前端点没有可用时间。 */
  readonly noTimes: string;
  /** 两端尚未完整。 */
  readonly incomplete: string;
  /** 允许跨天时结束时间落在次日的提示。 */
  readonly overnight: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  openPanel: label => `打开${label}时间面板`,
  clear: "清除时间范围",
  startField: label => `${label} 开始时间`,
  endField: label => `${label} 结束时间`,
  start: "开始",
  end: "结束",
  noTimes: "当前端点没有可用时间，请调整限制。",
  incomplete: "请选择完整起止时间，再确认范围。",
  overnight: "次日结束"
};

/** English. */
export const en: Messages = {
  openPanel: label => `Open ${label} time panel`,
  clear: "Clear time range",
  startField: label => `${label} start time`,
  endField: label => `${label} end time`,
  start: "Start",
  end: "End",
  noTimes: "No times are available for this endpoint. Adjust the constraints.",
  incomplete: "Choose both complete times before confirming.",
  overnight: "Ends on the next day"
};
