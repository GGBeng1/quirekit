/** Timeline interface text. */
export interface Messages {
  /** Accessible name of the event list when the host gives no label. */
  readonly label: string;
  /** Empty sequence text when no empty slot is supplied. */
  readonly empty: string;
  /** Default status labels by event status. */
  readonly status: {
    /** Ordinary record. */
    readonly neutral: string;
    /** Informational event. */
    readonly info: string;
    /** Successful event. */
    readonly success: string;
    /** Event needing attention. */
    readonly warning: string;
    /** Failed or abnormal event. */
    readonly danger: string;
  };
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  label: "事件记录", empty: "暂无记录",
  status: { neutral: "记录", info: "信息", success: "成功", warning: "需关注", danger: "异常" }
};

/** English. */
export const en: Messages = {
  label: "Event history", empty: "No records",
  status: { neutral: "Record", info: "Info", success: "Success", warning: "Attention", danger: "Error" }
};
