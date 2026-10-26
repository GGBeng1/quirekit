/** Clipboard interface text. */
export interface Messages {
  /** Visible copy action. */
  readonly copy: string;
  /** Visible and announced feedback after a confirmed write. */
  readonly copied: string;
  /** Feedback when the system clipboard rejects the write. */
  readonly error: string;
  /** Accessible name of the readonly input when no label is given. */
  readonly content: string;
  /** Accessible name of the copy button; the argument names the copied content when given. */
  readonly copyTarget: (label?: string) => string;
  /** Accessible name of the copy button during success feedback. */
  readonly copiedTarget: (label?: string) => string;
}

/** @param label - Copied content name. @returns The name, preceded by a space when it starts with Latin text. */
function spaced(label: string): string {
  return /^[A-Za-z0-9]/u.test(label) ? ` ${label}` : label;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  copy: "复制",
  copied: "已复制",
  error: "复制失败，请重试或手动复制",
  content: "待复制内容",
  copyTarget: label => label ? `复制${spaced(label)}` : "复制",
  copiedTarget: label => label ? `已复制${spaced(label)}` : "已复制"
};

/** English. */
export const en: Messages = {
  copy: "Copy",
  copied: "Copied",
  error: "Copy failed. Try again or copy manually.",
  content: "Content to copy",
  copyTarget: label => label ? `Copy ${label}` : "Copy",
  copiedTarget: label => label ? `Copied ${label}` : "Copied"
};
