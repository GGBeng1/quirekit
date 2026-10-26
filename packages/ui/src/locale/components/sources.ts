/** Sources and InlineCitation interface text. */
export interface Messages {
  /** Default disclosure title of a source list. */
  readonly title: string;
  /** Resource that is missing or no longer accessible. */
  readonly unavailable: string;
  /** Navigate-to-source action. */
  readonly navigate: string;
  /** Accessible name of an available source entry. */
  readonly navigateTo: (title: string) => string;
  /** Accessible name of an unavailable source entry. */
  readonly unavailableSource: (title: string) => string;
  /** Accessible name of an inline citation marker. */
  readonly citation: (marker: string, title: string) => string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  title: "引用来源",
  unavailable: "来源不可用",
  navigate: "查看来源",
  navigateTo: title => `查看来源：${title}`,
  unavailableSource: title => `${title}：来源不可用`,
  citation: (marker, title) => `${marker}：${title}`
};

/** English. */
export const en: Messages = {
  title: "Sources",
  unavailable: "Source unavailable",
  navigate: "View source",
  navigateTo: title => `View source: ${title}`,
  unavailableSource: title => `${title}: source unavailable`,
  citation: (marker, title) => `${marker}: ${title}`
};
