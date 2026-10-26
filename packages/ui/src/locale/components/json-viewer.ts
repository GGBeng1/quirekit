/** Interface text of JsonViewer, supplied by the active language pack. */
export interface Messages {
  /** Default accessible name of the viewer. */
  readonly label: string;
  /** Copied content named in the copy button's accessible name. */
  readonly copyTarget: string;
  /** Tree view option. */
  readonly tree: string;
  /** Source view option. */
  readonly source: string;
  /** Accessible name of the view switch, given the viewer label. */
  readonly viewSwitch: (label: string) => string;
  /** Accessible name of the tree area, given the viewer label. */
  readonly treeContent: (label: string) => string;
  /** Accessible name of the source area, given the viewer label. */
  readonly sourceContent: (label: string) => string;
  /** Notice when the input is too large for the tree. */
  readonly tooLarge: string;
  /** Notice when the input is not valid JSON. */
  readonly invalid: string;
  /** Reveal the clipped source. */
  readonly showFullSource: string;
  /** Clip the source preview again. */
  readonly collapseSource: string;
  /** Child count shown beside an object or array. */
  readonly entries: (count: number) => string;
  /** Reveal the next page of children. */
  readonly showMore: (count: number) => string;
  /** Branch deeper than the tree renders. */
  readonly depthLimit: string;
  /** Reveal a long scalar value. */
  readonly expandValue: string;
  /** Shorten a long scalar value again. */
  readonly collapseValue: string;
}

/** @param count - Item count. @param noun - Singular noun. @returns Count with an English plural. */
function plural(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  label: "JSON 数据", copyTarget: "JSON 原文",
  tree: "树形", source: "原文",
  viewSwitch: label => `${label}视图`, treeContent: label => `${label}树形内容`, sourceContent: label => `${label}原文`,
  tooLarge: "数据较大，显示原文", invalid: "不是有效 JSON，显示原文",
  showFullSource: "显示完整原文", collapseSource: "收起原文预览",
  entries: count => `${count} 项`, showMore: count => `再显示 ${count} 项`, depthLimit: "层级较深，请查看原文",
  expandValue: "展开", collapseValue: "收起"
};

/** English. */
export const en: Messages = {
  label: "JSON data", copyTarget: "JSON source",
  tree: "Tree", source: "Source",
  viewSwitch: label => `${label} view`, treeContent: label => `${label} tree`, sourceContent: label => `${label} source`,
  tooLarge: "Large data, showing source", invalid: "Not valid JSON, showing source",
  showFullSource: "Show full source", collapseSource: "Collapse source",
  entries: count => plural(count, "item"), showMore: count => `Show ${count} more`, depthLimit: "Nested too deep, see source",
  expandValue: "Expand", collapseValue: "Collapse"
};
