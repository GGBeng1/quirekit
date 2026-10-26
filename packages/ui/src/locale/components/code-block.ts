/** Interface text of CodeBlock and CodeBlockHeader, supplied by the active language pack. */
export interface Messages {
  /** Title and accessible name when neither filename nor language is given. */
  readonly code: string;
  /** Copied content named in the copy button's accessible name. */
  readonly copyTarget: string;
  /** Reveal collapsed source. */
  readonly expand: string;
  /** Collapse visible source. */
  readonly collapse: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = { code: "代码", copyTarget: "代码", expand: "展开代码", collapse: "收起代码" };

/** English. */
export const en: Messages = { code: "Code", copyTarget: "code", expand: "Expand code", collapse: "Collapse code" };
