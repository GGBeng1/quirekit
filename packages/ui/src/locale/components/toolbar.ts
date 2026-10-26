/** Toolbar interface text. */
export interface Messages {
  /** Accessible name and tooltip of the previous-screen scroll button. */
  readonly scrollPrevious: string;
  /** Accessible name and tooltip of the next-screen scroll button. */
  readonly scrollNext: string;
  /** Accessible name of the control holding collapsed items. */
  readonly more: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = { scrollPrevious: "向前滚动", scrollNext: "向后滚动", more: "更多" };

/** English. */
export const en: Messages = { scrollPrevious: "Scroll back", scrollNext: "Scroll forward", more: "More" };
