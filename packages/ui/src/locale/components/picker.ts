/** 日期时间选择器家族共享的界面文案：面板操作、分段与时间列名称、校验反馈。 */
export interface Messages {
  /** 移动端底部面板的关闭按钮。 */
  readonly close: string;
  /** 把草稿设为当前时间的按钮。 */
  readonly now: string;
  /** 放弃草稿并关闭面板的按钮。 */
  readonly cancel: string;
  /** 确认草稿的按钮。 */
  readonly confirm: string;
  /** 分段输入中各可编辑分段的名称，与字段名组合为可访问名称。 */
  readonly segments: Readonly<Record<"year" | "month" | "day" | "era" | "hour" | "minute" | "second" | "dayPeriod", string>>;
  /** 时间面板各列标题。 */
  readonly columns: Readonly<Record<"period" | "hour" | "minute" | "second", string>>;
  /** 字段名与分段或列名组合成的可访问名称。 */
  readonly part: (field: string, part: string) => string;
  /** 日期超出上下限；未设置的一端为 undefined。 */
  readonly dateBetween: (min: string | undefined, max: string | undefined) => string;
  /** 日期被业务规则禁止。 */
  readonly dateUnavailable: string;
  /** 日期范围中包含不可选日期。 */
  readonly rangeIncludesUnavailable: (date: string) => string;
  /** 日期范围开始晚于结束。 */
  readonly dateRangeReversed: string;
  /** 时间超出上下限，两端均已补全为具体时间。 */
  readonly timeBetween: (min: string, max: string) => string;
  /** 时间不符合步长。 */
  readonly timeStep: string;
  /** 时间被业务规则禁止。 */
  readonly timeUnavailable: string;
  /** 日期时间超出上下限；未设置的一端为 undefined。 */
  readonly dateTimeBetween: (min: string | undefined, max: string | undefined) => string;
  /** 日期时间被业务规则禁止。 */
  readonly dateTimeUnavailable: string;
  /** 范围中某一端点的校验错误，带上端点名称。 */
  readonly endpointError: (endpoint: "start" | "end", error: string) => string;
  /** 时间范围结束早于开始。 */
  readonly timeRangeReversed: string;
  /** 时间范围被业务规则禁止。 */
  readonly timeRangeUnavailable: string;
  /** 日期时间范围结束早于开始。 */
  readonly dateTimeRangeReversed: string;
  /** 日期时间范围被业务规则禁止。 */
  readonly dateTimeRangeUnavailable: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  close: "关闭",
  now: "现在",
  cancel: "取消",
  confirm: "确定",
  segments: { year: "年", month: "月", day: "日", era: "纪元", hour: "时", minute: "分", second: "秒", dayPeriod: "上午或下午" },
  columns: { period: "时段", hour: "时", minute: "分", second: "秒" },
  part: (field, part) => `${field} ${part}`,
  dateBetween: (min, max) => `日期应在 ${min ?? "不限"} 至 ${max ?? "不限"} 之间。`,
  dateUnavailable: "此日期不可选，请选择其他日期。",
  rangeIncludesUnavailable: date => `范围包含不可选日期 ${date}，请重新选择。`,
  dateRangeReversed: "开始日期不能晚于结束日期，请调整起止日期。",
  timeBetween: (min, max) => `时间应在 ${min} 至 ${max} 之间。`,
  timeStep: "此时间不符合步长，请从列表选择可用时间。",
  timeUnavailable: "此时间不可选，请选择其他时间。",
  dateTimeBetween: (min, max) => `日期时间应在 ${min ?? "不限"} 至 ${max ?? "不限"} 之间。`,
  dateTimeUnavailable: "此日期时间不可用，请调整日期或时间。",
  endpointError: (endpoint, error) => `${endpoint === "start" ? "开始时间" : "结束时间"}: ${error}`,
  timeRangeReversed: "结束时间不能早于开始时间，请调整起止时间。",
  timeRangeUnavailable: "此时间范围不可用，请调整起止时间。",
  dateTimeRangeReversed: "结束时间不能早于开始时间，请调整起止日期时间。",
  dateTimeRangeUnavailable: "此日期时间范围不可用，请调整起止日期时间。"
};

/** English. */
export const en: Messages = {
  close: "Close",
  now: "Now",
  cancel: "Cancel",
  confirm: "Confirm",
  segments: { year: "year", month: "month", day: "day", era: "era", hour: "hour", minute: "minute", second: "second", dayPeriod: "AM or PM" },
  columns: { period: "Period", hour: "Hour", minute: "Minute", second: "Second" },
  part: (field, part) => `${field} ${part}`,
  dateBetween: (min, max) => `Dates must be between ${min ?? "any"} and ${max ?? "any"}.`,
  dateUnavailable: "This date is unavailable. Choose another date.",
  rangeIncludesUnavailable: date => `The range includes unavailable date ${date}. Choose another range.`,
  dateRangeReversed: "Start must not be after end. Adjust the dates.",
  timeBetween: (min, max) => `Choose a time between ${min} and ${max}.`,
  timeStep: "This time does not match the steps. Choose an available time.",
  timeUnavailable: "This time is unavailable. Choose another time.",
  dateTimeBetween: (min, max) => `Choose a date and time between ${min ?? "no lower limit"} and ${max ?? "no upper limit"}.`,
  dateTimeUnavailable: "This date and time is unavailable. Adjust the date or time.",
  endpointError: (endpoint, error) => `${endpoint === "start" ? "Start time" : "End time"}: ${error}`,
  timeRangeReversed: "End time must not be before start time. Adjust either endpoint.",
  timeRangeUnavailable: "This time range is unavailable. Adjust either endpoint.",
  dateTimeRangeReversed: "End must not be before start. Adjust either date and time.",
  dateTimeRangeUnavailable: "This date-time range is unavailable. Adjust either endpoint."
};
