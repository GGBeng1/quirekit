/** Interface text of DiffViewer, supplied by the active language pack. */
export interface Messages {
  /** Default accessible name of the viewer. */
  readonly label: string;
  /** Copied content named in the copy button's accessible name. */
  readonly copyTarget: string;
  /** Structured diff view option. */
  readonly diff: string;
  /** Raw patch view option. */
  readonly source: string;
  /** Accessible name of the view switch, given the viewer label. */
  readonly viewSwitch: (label: string) => string;
  /** Accessible name of the structured diff area, given the viewer label. */
  readonly diffContent: (label: string) => string;
  /** Accessible name of the raw patch area, given the viewer label. */
  readonly sourceContent: (label: string) => string;
  /** Notice when the patch is too large to structure. */
  readonly tooLarge: string;
  /** Notice when the input is not a unified diff. */
  readonly invalid: string;
  /** Reveal the clipped patch. */
  readonly showFullSource: string;
  /** Clip the patch preview again. */
  readonly collapseSource: string;
  /** Accessible name of one hunk, given its one-based position. */
  readonly hunk: (position: number) => string;
  /** Reveal hidden lines before the visible window. */
  readonly revealBefore: (count: number) => string;
  /** Reveal hidden lines after the visible window. */
  readonly revealAfter: (count: number) => string;
  /** Accessible name of an old-file line number. */
  readonly oldLine: (line: number) => string;
  /** Accessible name of a new-file line number. */
  readonly newLine: (line: number) => string;
  /** Accessible name of the addition marker. */
  readonly added: string;
  /** Accessible name of the removal marker. */
  readonly removed: string;
}

/** @param count - Line count. @returns Count with an English plural. */
function lines(count: number): string {
  return `${count} ${count === 1 ? "line" : "lines"}`;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  label: "代码差异", copyTarget: "完整补丁", diff: "差异", source: "原文",
  viewSwitch: label => `${label}视图`, diffContent: label => `${label}内容`, sourceContent: label => `${label}原文`,
  tooLarge: "差异较大，显示原文", invalid: "不是有效统一差异，显示原文",
  showFullSource: "显示完整原文", collapseSource: "收起原文预览",
  hunk: position => `差异片段 ${position}`,
  revealBefore: count => `展开前面 ${count} 行`, revealAfter: count => `展开后面 ${count} 行`,
  oldLine: line => `旧文件第 ${line} 行`, newLine: line => `新文件第 ${line} 行`,
  added: "新增行", removed: "删除行"
};

/** English. */
export const en: Messages = {
  label: "Code diff", copyTarget: "full patch", diff: "Diff", source: "Source",
  viewSwitch: label => `${label} view`, diffContent: label => `${label} content`, sourceContent: label => `${label} source`,
  tooLarge: "Large diff, showing source", invalid: "Not a valid unified diff, showing source",
  showFullSource: "Show full source", collapseSource: "Collapse source",
  hunk: position => `Hunk ${position}`,
  revealBefore: count => `Show ${lines(count)} above`, revealAfter: count => `Show ${lines(count)} below`,
  oldLine: line => `Old line ${line}`, newLine: line => `New line ${line}`,
  added: "Added line", removed: "Removed line"
};
