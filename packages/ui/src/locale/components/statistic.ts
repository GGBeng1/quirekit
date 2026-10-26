/** Statistic interface text. */
export interface Messages {
  /** Accessible text while the value loads. */
  readonly loading: string;
  /** Accessible meaning of the empty placeholder. */
  readonly empty: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = { loading: "加载中", empty: "暂无数据" };

/** English. */
export const en: Messages = { loading: "Loading", empty: "No data" };
