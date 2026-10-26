import type { QuireKitSemanticTypographyRole } from "../../theme";

/** Ark UI/Zag 支持的 Popover 锚点方位。 */
export type QuireKitPopoverPlacement =
  | "top"
  | "top-start"
  | "top-end"
  | "right"
  | "right-start"
  | "right-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end";

/** Popover Content 可选的视觉边界强度。 */
export type QuireKitPopoverBorder = "none" | "subtle" | "default";

/** Popover 标题排版的组件级投影。 */
export interface QuireKitPopoverTitleTokens {
  /** 标题字号。 */
  readonly fontSize: QuireKitSemanticTypographyRole["fontSize"];
  /** 标题行高。 */
  readonly lineHeight: QuireKitSemanticTypographyRole["lineHeight"];
  /** 标题字重。 */
  readonly fontWeight: QuireKitSemanticTypographyRole["fontWeight"];
  /** 标题字距。 */
  readonly letterSpacing: QuireKitSemanticTypographyRole["letterSpacing"];
}

/** Popover 正文排版的组件级投影。 */
export interface QuireKitPopoverBodyTokens {
  /** 正文字号。 */
  readonly fontSize: QuireKitSemanticTypographyRole["fontSize"];
  /** 正文行高。 */
  readonly lineHeight: QuireKitSemanticTypographyRole["lineHeight"];
}

/** Popover 的完整组件 token 合同。 */
export interface QuireKitPopoverTokens {
  /** 浮层背景。 */
  readonly background: string;
  /** 标题与主要正文颜色。 */
  readonly foreground: string;
  /** 描述和辅助信息颜色。 */
  readonly mutedForeground: string;
  /** 浮层边界颜色。 */
  readonly borderColor: string;
  /** 浮层边界宽度。 */
  readonly borderWidth: string;
  /** 浮层圆角。 */
  readonly radius: string;
  /** 浮层投影。 */
  readonly shadow: string;
  /** 浮层内部间距。 */
  readonly padding: string;
  /** 标题、描述与正文之间的节奏。 */
  readonly gap: string;
  /** 箭头盒尺寸。 */
  readonly arrowSize: string;
  /** 关闭按钮尺寸。 */
  readonly closeSize: string;
  /** 关闭按钮圆角。 */
  readonly closeRadius: string;
  /** 关闭按钮 hover 背景。 */
  readonly closeHoverBackground: string;
  /** 关闭按钮图标颜色。 */
  readonly closeForeground: string;
  /** 键盘焦点边界颜色。 */
  readonly focusColor: string;
  /** 浮层字体族。 */
  readonly fontFamily: string;
  /** 标题排版。 */
  readonly title: QuireKitPopoverTitleTokens;
  /** 正文排版。 */
  readonly body: QuireKitPopoverBodyTokens;
  /** 浮层进入与退出时长。 */
  readonly motionDuration: string;
  /** 浮层进入 easing。 */
  readonly enterEasing: string;
  /** 浮层退出 easing。 */
  readonly exitEasing: string;
  /** Popover 的语义堆叠层级。 */
  readonly layer: number;
}
