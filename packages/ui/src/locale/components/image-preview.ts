/** ImagePreview 的界面与可访问文案。 */
export interface Messages {
  /** 当前图片没有可见标题时使用的对话框名称。 */
  readonly title: string;
  /** 关闭预览操作。 */
  readonly close: string;
  /** 上一张操作。 */
  readonly previous: string;
  /** 下一张操作。 */
  readonly next: string;
  /** 缩小操作。 */
  readonly zoomOut: string;
  /** 放大操作。 */
  readonly zoomIn: string;
  /** 恢复适应窗口操作。 */
  readonly fit: string;
  /** 向左旋转操作。 */
  readonly rotateLeft: string;
  /** 向右旋转操作。 */
  readonly rotateRight: string;
  /** 图片工具栏的可访问名称。 */
  readonly toolbar: string;
  /** 当前图片计数的可访问名称。 */
  readonly current: string;
  /** 缩略图导航的可访问名称。 */
  readonly thumbnails: string;
  /** 空图片组状态。 */
  readonly empty: string;
  /** 当前图片加载状态。 */
  readonly loading: string;
  /** 当前图片加载失败状态。 */
  readonly unavailable: string;
  /** 重新加载当前图片操作。 */
  readonly retry: string;
  /** 当前图片位置；current 从 1 开始，空组为 0。 */
  readonly position: (current: number, total: number) => string;
  /** 缩略图操作名称；position 从 1 开始，name 为图片标题或替代说明。 */
  readonly thumbnail: (position: number, name: string) => string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  title: "图片预览",
  close: "关闭预览",
  previous: "上一张",
  next: "下一张",
  zoomOut: "缩小",
  zoomIn: "放大",
  fit: "适应窗口",
  rotateLeft: "向左旋转",
  rotateRight: "向右旋转",
  toolbar: "图片工具",
  current: "当前图片",
  thumbnails: "图片列表",
  empty: "暂无可预览的图片",
  loading: "正在加载图片…",
  unavailable: "图片加载失败",
  retry: "重新加载",
  position: (current, total) => `${current} / ${total}`,
  thumbnail: (position, name) => `查看第 ${position} 张：${name}`
};

/** English. */
export const en: Messages = {
  title: "Image preview",
  close: "Close preview",
  previous: "Previous image",
  next: "Next image",
  zoomOut: "Zoom out",
  zoomIn: "Zoom in",
  fit: "Fit to window",
  rotateLeft: "Rotate left",
  rotateRight: "Rotate right",
  toolbar: "Image tools",
  current: "Current image",
  thumbnails: "Image list",
  empty: "No images to preview",
  loading: "Loading image…",
  unavailable: "Image failed to load",
  retry: "Reload",
  position: (current, total) => `${current} / ${total}`,
  thumbnail: (position, name) => `View image ${position}: ${name}`
};
