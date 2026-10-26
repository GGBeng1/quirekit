/** Calendar 的界面文案：日期单元格状态播报与视图切换按钮。 */
export interface Messages {
  /** 日期为今天。 */
  readonly today: string;
  /** 日期不可选。 */
  readonly unavailable: string;
  /** 日期是所选范围的起点。 */
  readonly rangeStart: string;
  /** 日期是所选范围的终点。 */
  readonly rangeEnd: string;
  /** 日期已选中。 */
  readonly selected: string;
  /** 状态与日期文本之间的分隔符。 */
  readonly separator: string;
  /** 上一页按钮，按当前视图区分月、年、十年。 */
  readonly previous: (view: "day" | "month" | "year") => string;
  /** 下一页按钮，按当前视图区分月、年、十年。 */
  readonly next: (view: "day" | "month" | "year") => string;
  /** 切换到上一级视图的标题按钮。 */
  readonly switchView: (view: "day" | "month" | "year") => string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  today: "今天",
  unavailable: "不可选",
  rangeStart: "范围起点",
  rangeEnd: "范围终点",
  selected: "已选",
  separator: "，",
  previous: view => view === "day" ? "上个月" : view === "month" ? "上一年" : "上一个十年",
  next: view => view === "day" ? "下个月" : view === "month" ? "下一年" : "下一个十年",
  switchView: view => view === "day" ? "选择月份" : view === "month" ? "选择年份" : "年份范围"
};

/** English. */
export const en: Messages = {
  today: "Today",
  unavailable: "Unavailable",
  rangeStart: "Range start",
  rangeEnd: "Range end",
  selected: "Selected",
  separator: ", ",
  previous: view => view === "day" ? "Previous month" : view === "month" ? "Previous year" : "Previous decade",
  next: view => view === "day" ? "Next month" : view === "month" ? "Next year" : "Next decade",
  switchView: view => view === "day" ? "Choose month" : view === "month" ? "Choose year" : "Year range"
};
