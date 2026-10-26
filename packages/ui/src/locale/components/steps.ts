/** Steps interface text. */
export interface Messages {
  /** Empty-state heading when there are no steps. */
  readonly empty: string;
  /** Status shown after the last step when no completed slot is supplied. */
  readonly completed: string;
  /** Screen-reader suffix after a finished step's title. */
  readonly stepCompleted: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = { empty: "暂无步骤", completed: "全部步骤已完成", stepCompleted: " · 已完成" };

/** English. */
export const en: Messages = { empty: "No steps", completed: "All steps completed", stepCompleted: " · Completed" };
