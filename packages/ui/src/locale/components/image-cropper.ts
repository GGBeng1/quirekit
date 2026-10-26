/** ImageCropper 的界面文案与可访问说明。 */
export interface Messages {
  /** 裁剪工作区名称。 */
  readonly label: string;
  /** 裁剪工作区的可访问名称；alt 为原图描述。 */
  readonly root: (alt: string) => string;
  /** 调整裁剪框模式。 */
  readonly frame: string;
  /** 移动图片模式。 */
  readonly pan: string;
  /** 裁剪比例字段。 */
  readonly aspectRatio: string;
  /** 不限比例。 */
  readonly free: string;
  /** 自定义比例。 */
  readonly custom: string;
  /** 缩放字段。 */
  readonly zoom: string;
  /** 在当前比例下恢复完整图片。 */
  readonly reset: string;
  /** 加载中状态。 */
  readonly loading: string;
  /** 图片无法加载状态。 */
  readonly unavailable: string;
  /** 重新加载图片。 */
  readonly retry: string;
  /** 裁剪区域的可访问名称。 */
  readonly selection: string;
  /** 调整裁剪框时的键盘说明。 */
  readonly instructions: string;
  /** 移动图片时的键盘说明。 */
  readonly panInstructions: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  label: "图片裁剪", root: alt => `图片裁剪：${alt}`, frame: "调整裁剪框", pan: "移动图片", aspectRatio: "裁剪比例",
  free: "自由", custom: "自定义", zoom: "缩放", reset: "重置", loading: "正在加载图片…", unavailable: "图片暂时无法加载",
  retry: "重试", selection: "裁剪区域",
  instructions: "拖动裁剪框或边角调整范围；方向键微调，Alt + 方向键调整大小，Shift 加速，+ / − 缩放。",
  panInstructions: "拖动图片调整位置；方向键平移，Shift 加速，+ / − 缩放。"
};

/** English. */
export const en: Messages = {
  label: "Image crop", root: alt => `Image crop: ${alt}`, frame: "Adjust frame", pan: "Move image", aspectRatio: "Aspect ratio",
  free: "Free", custom: "Custom", zoom: "Zoom", reset: "Reset", loading: "Loading image…", unavailable: "Image can't be loaded right now",
  retry: "Retry", selection: "Crop area",
  instructions: "Drag the frame or its corners to adjust; arrow keys nudge, Alt + arrow keys resize, Shift speeds up, + / − zoom.",
  panInstructions: "Drag the image to reposition; arrow keys pan, Shift speeds up, + / − zoom."
};
