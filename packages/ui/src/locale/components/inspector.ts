/** Inspector interface text. */
export interface Messages {
  /** Default status while properties are syncing. */
  readonly busy: string;
  /** Default status when the selection holds different values. */
  readonly mixed: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  busy: "正在更新…",
  mixed: "多个对象的值不同"
};

/** English. */
export const en: Messages = {
  busy: "Updating…",
  mixed: "Selected objects have different values"
};
