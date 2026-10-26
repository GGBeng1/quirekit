import type { QuireKitControlSize } from "../control";
/** Color Picker 与其他 QuireKit 控件共享的公开尺寸。 */
export type QuireKitColorPickerSize = QuireKitControlSize;

/** Color Picker 浮层支持的稳定方位。 */
export type QuireKitColorPickerPlacement =
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

/** 精确编辑器公开的文本输入格式。 */
export type QuireKitColorInputFormat = "hex" | "rgb" | "hsl" | "hsb";

/** 快捷色板的一行颜色。 */
export type QuireKitColorRow = readonly string[];

/** 快捷色板可消费的只读颜色矩阵。 */
export type QuireKitColorRows = readonly QuireKitColorRow[];

/** 开箱即用 Color Picker 的公开属性。 */
export interface QuireKitColorPickerProps {
  /** 受控 CSS 颜色字符串。 */
  readonly modelValue?: string;
  /** 当前是否为无颜色；可用 v-model:reset-active 同步自定义图标，颜色值仍保留上次可编辑颜色。 */
  readonly resetActive?: boolean | undefined;
  /** 非受控模式的初始 CSS 颜色字符串。 */
  readonly defaultValue?: string;
  /** 受控浮层状态。 */
  readonly open?: boolean;
  /** 非受控模式的初始浮层状态。 */
  readonly defaultOpen?: boolean;
  /** 触发器与颜色面板的可访问名称，说明本实例选择的是什么颜色；缺省取语言包。 */
  readonly label?: string;
  /** 触发器尺寸。 */
  readonly size?: QuireKitColorPickerSize;
  /** 浮层首选方位。 */
  readonly placement?: QuireKitColorPickerPlacement;
  /** 文档快捷颜色矩阵。 */
  readonly colors?: QuireKitColorRows;
  /** 由宿主受控的最近使用颜色。 */
  readonly recentColors?: readonly string[];
  /** 清除颜色动作名称，表达本实例的清除语义（如“自动”“无填充”）；缺省取语言包。 */
  readonly resetLabel?: string;
  /** 是否提供清除文档颜色动作。 */
  readonly allowReset?: boolean;
  /** 是否提供进入精确颜色编辑器的“更多颜色”动作；固定色值空间的文档语义可关闭。 */
  readonly showMore?: boolean;
  /** 是否提供透明度编辑。 */
  readonly showAlpha?: boolean;
  /** 是否在精确颜色编辑器中显示屏幕取色动作。 */
  readonly showEyedropper?: boolean;
  /** 精确编辑器开放的颜色输入格式。 */
  readonly inputFormats?: readonly QuireKitColorInputFormat[];
  /** 精确编辑器初次打开时使用的输入格式。 */
  readonly defaultInputFormat?: QuireKitColorInputFormat;
  /** 是否把浮层传送到 portalTarget。 */
  readonly portalled?: boolean;
  /** 浮层传送目标；默认为 body。 */
  readonly portalTarget?: string | HTMLElement;
  /** 浮层的宿主标记和语言；键盘、焦点与 ARIA 关系仍由组件维护。 */
  readonly contentAttributes?: Readonly<Record<`data-${string}`, string | number | boolean | undefined>> & {
    /** 宿主提供的内容类名。 */
    readonly class?: string;
    /** 浮层内容语言。 */
    readonly lang?: string;
    /** 浮层内容书写方向。 */
    readonly dir?: "ltr" | "rtl";
  };
  /** 是否禁用颜色选择。 */
  readonly disabled?: boolean;
  /** 隐藏表单输入的字段名。 */
  readonly name?: string;
}
