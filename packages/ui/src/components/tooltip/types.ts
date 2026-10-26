import type { QuireKitSemanticTypographyRole } from "../../theme";

/** Ark UI/Zag 支持的 Tooltip 锚点方位。 */
export type QuireKitTooltipPlacement =
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

/** Tooltip 文案解析输入。 */
export interface QuireKitTooltipContentOptions {
  /** 控件可用时展示的标签或快捷键说明。 */
  readonly content?: string;
  /** 控件不可用时展示的稳定原因。 */
  readonly disabledReason?: string;
  /** Tooltip 所解释的控件当前是否不可用。 */
  readonly subjectDisabled?: boolean;
}

/** Tooltip 紧凑文字的组件级投影。 */
export interface QuireKitTooltipTypographyTokens {
  /** 提示文字使用的字体族。 */
  readonly fontFamily: QuireKitSemanticTypographyRole["fontFamily"];
  /** 提示文字字号。 */
  readonly fontSize: QuireKitSemanticTypographyRole["fontSize"];
  /** 提示文字行高。 */
  readonly lineHeight: QuireKitSemanticTypographyRole["lineHeight"];
  /** 提示文字字重。 */
  readonly fontWeight: QuireKitSemanticTypographyRole["fontWeight"];
  /** 提示文字字距。 */
  readonly letterSpacing: QuireKitSemanticTypographyRole["letterSpacing"];
}

/** Tooltip 的完整组件 token 合同。 */
export interface QuireKitTooltipTokens {
  /** 与页面形成反差的提示背景。 */
  readonly background: string;
  /** 提示前景色。 */
  readonly foreground: string;
  /** Tooltip 物理外壳的边界颜色。 */
  readonly borderColor: string;
  /** Tooltip 物理外壳的边界宽度。 */
  readonly borderWidth: string;
  /** Tooltip 控件级圆角。 */
  readonly radius: string;
  /** 仅属于 Tooltip 物理外壳的浮层阴影。 */
  readonly shadow: string;
  /** 内容块方向的紧凑内边距。 */
  readonly paddingBlock: string;
  /** 内容行方向的紧凑内边距。 */
  readonly paddingInline: string;
  /** 多段提示内容之间的间距。 */
  readonly gap: string;
  /** 可选定位箭头的盒尺寸。 */
  readonly arrowSize: string;
  /** Tooltip 排版。 */
  readonly typography: QuireKitTooltipTypographyTokens;
  /** 进入与退出的反馈时长。 */
  readonly motionDuration: string;
  /** Tooltip 进入 easing。 */
  readonly enterEasing: string;
  /** Tooltip 退出 easing。 */
  readonly exitEasing: string;
  /** Tooltip 的语义堆叠层级。 */
  readonly layer: number;
}
