/** Image 的界面文案。 */
export interface Messages {
  /** 加载中占位的读屏文本。 */
  readonly loading: string;
  /** 加载失败提示。 */
  readonly failed: string;
  /** 重新加载动作。 */
  readonly retry: string;
  /** 预览入口上的可见提示。 */
  readonly previewHint: string;
  /** 预览入口的可访问名称；name 为标题或替代文本，均缺省时为 undefined。 */
  readonly preview: (name: string | undefined) => string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  loading: "图片加载中",
  failed: "图片加载失败",
  retry: "重新加载",
  previewHint: "预览",
  preview: name => `预览：${name ?? "图片"}`
};

/** English. */
export const en: Messages = {
  loading: "Loading image",
  failed: "Image failed to load",
  retry: "Reload",
  previewHint: "Preview",
  preview: name => name === undefined ? "Preview image" : `Preview: ${name}`
};
