/** DateRangePicker 的界面文案。 */
export interface Messages {
  /** 清除整个范围按钮的可访问名称。 */
  readonly clear: string;
  /** 未提供 startLabel 时开始日期字段的名称。 */
  readonly startField: (label: string) => string;
  /** 未提供 endLabel 时结束日期字段的名称。 */
  readonly endField: (label: string) => string;
  /** 快捷方式给出不完整范围时的提示。 */
  readonly incomplete: string;
  /** 已选开始日期、等待结束日期时的面板提示。 */
  readonly chooseEnd: string;
  /** 尚未选择日期时的面板提示。 */
  readonly chooseBoth: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  clear: "清除日期范围",
  startField: label => `${label} 开始日期`,
  endField: label => `${label} 结束日期`,
  incomplete: "请选择完整起止日期。",
  chooseEnd: "请选择结束日期；Escape 取消本次选择。",
  chooseBoth: "选择起止日期，完成后回填。"
};

/** English. */
export const en: Messages = {
  clear: "Clear date range",
  startField: label => `${label} start date`,
  endField: label => `${label} end date`,
  incomplete: "Choose both start and end dates.",
  chooseEnd: "Choose the end date; Escape cancels this selection.",
  chooseBoth: "Choose both dates to apply the range."
};
