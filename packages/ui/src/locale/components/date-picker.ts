/** DatePicker 的界面文案。 */
export interface Messages {
  /** 打开日历按钮的可访问名称，包含字段名。 */
  readonly openCalendar: (label: string) => string;
}

/** Simplified Chinese. */
export const zhCN: Messages = { openCalendar: label => `打开${label}日历` };

/** English. */
export const en: Messages = { openCalendar: label => `Open ${label} calendar` };
