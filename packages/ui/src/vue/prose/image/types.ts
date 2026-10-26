import type { QuireKitImageProps } from "../../image/types";

/** 正文图片独占一行；在 Prose 内共享图片组，独立使用时保留单图预览。 */
export interface QuireKitProseImageProps extends QuireKitImageProps {
  /** 默认开启点击与键盘预览；加入最近的 Prose 图片组，外层存在链接或按钮时自动关闭。 */
  readonly preview?: boolean;
  /** 显示宽度；与数字 height 同时提供时建立可收缩的原始比例。 */
  readonly width?: string | number;
  /** 显示高度；数字尺寸配对时随阅读列宽度同比缩放。 */
  readonly height?: string | number;
}

/** 图片状态插槽的公共上下文。 */
export interface QuireKitProseImageState {
  /** 当前请求地址。 */
  readonly src: string;
  /** 是否正在展示备用图。 */
  readonly fallback: boolean;
}

/** 图片失败后的恢复入口。 */
export interface QuireKitProseImageErrorState extends QuireKitProseImageState {
  /** 从原图重新开始请求。 */
  readonly retry: () => void;
}
