/** Prose interface text. */
export interface Messages {
  /** Accessible name of a collapsed container's disclosure button. */
  readonly expand: (title: string) => string;
  /** Accessible name of an open container's disclosure button. */
  readonly collapse: (title: string) => string;
  /** Accessible name of the preview tabs when the host gives no label. */
  readonly previewTabs: string;
  /** Preview tab. */
  readonly preview: string;
  /** Source tab. */
  readonly source: string;
  /** Accessible name of the example source file picker. */
  readonly sourceFile: string;
  /** Failure text for an image inside a link or button. */
  readonly imageFailed: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  expand: title => `展开 ${title}`, collapse: title => `收起 ${title}`,
  previewTabs: "示例视图", preview: "预览", source: "源码", sourceFile: "查看源码文件", imageFailed: "图片加载失败"
};

/** English. */
export const en: Messages = {
  expand: title => `Expand ${title}`, collapse: title => `Collapse ${title}`,
  previewTabs: "Example view", preview: "Preview", source: "Source", sourceFile: "Source file", imageFailed: "Image failed to load"
};
