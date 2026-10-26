import type { QuireKitInputSize } from "../input";

/** InputNumber 的公开属性。 */
export interface QuireKitNumberInputProps {
  /** 受控的本地化数值字符串。 */
  readonly modelValue?: string;
  /** 非受控模式的初始数值字符串。 */
  readonly defaultValue?: string;
  /** 输入和步进按钮的可访问名称。 */
  readonly label: string;
  /** Empty or mixed hint; omitted uses localized field guidance, empty string suppresses it. */
  readonly placeholder?: string | undefined;
  /** 控件高度和排版尺寸。 */
  readonly size?: QuireKitInputSize;
  /** 控件的 CSS 宽度。 */
  readonly width?: string | number;
  /** 是否允许鼠标滚轮修改数值。 */
  readonly allowMouseWheel?: boolean;
  /** 是否允许值暂时超出 min / max。 */
  readonly allowOverflow?: boolean;
  /** 失焦时是否把值限制到 min / max。 */
  readonly clampValueOnBlur?: boolean;
  /** 步进后是否把焦点交还输入框。 */
  readonly focusInputOnChange?: boolean;
  /** 关联的 form id。 */
  readonly form?: string;
  /** Intl.NumberFormat 格式化选项。 */
  readonly formatOptions?: Intl.NumberFormatOptions;
  /** 控件的稳定 id。 */
  readonly id?: string;
  /** 各部件的自定义 id。 */
  readonly ids?: QuireKitNumberInputIds;
  /** 移动端键盘输入模式。 */
  readonly inputMode?: "text" | "tel" | "numeric" | "decimal";
  /** 是否显示错误状态。 */
  readonly invalid?: boolean;
  /** 按住 Shift 时的步长。 */
  readonly largeStep?: number;
  /** 最大值。 */
  readonly max?: number;
  /** 最小值。 */
  readonly min?: number;
  /** 原生字段名。 */
  readonly name?: string;
  /** 原生输入格式约束。 */
  readonly pattern?: string;
  /** 是否允许聚焦但禁止修改。 */
  readonly readOnly?: boolean;
  /** 是否要求表单提交一个值。 */
  readonly required?: boolean;
  /** 按住 Alt 时的步长。 */
  readonly smallStep?: number;
  /** 长按增减按钮时是否连续步进。 */
  readonly spinOnPress?: boolean;
  /** 普通增减步长。 */
  readonly step?: number;
  /** 是否禁用输入与步进按钮。 */
  readonly disabled?: boolean;
}

/** InputNumber 各部件的自定义 id。 */
export interface QuireKitNumberInputIds {
  /** Root 元素 id。 */
  readonly root?: string;
  /** Label 元素 id。 */
  readonly label?: string;
  /** Input 元素 id。 */
  readonly input?: string;
  /** 增加按钮 id。 */
  readonly incrementTrigger?: string;
  /** 减少按钮 id。 */
  readonly decrementTrigger?: string;
  /** Scrubber 元素 id。 */
  readonly scrubber?: string;
}

/** InputNumber 值变化详情。 */
export interface QuireKitNumberInputValueChange {
  /** 当前本地化字符串。 */
  readonly value: string;
  /** 当前 JavaScript 数值；空值时为 NaN。 */
  readonly valueAsNumber: number;
}

/** InputNumber 焦点变化详情。 */
export interface QuireKitNumberInputFocusChange extends QuireKitNumberInputValueChange {
  /** 输入当前是否拥有焦点。 */
  readonly focused: boolean;
}

/** InputNumber 越界原因。 */
export type QuireKitNumberInputInvalidReason = "rangeUnderflow" | "rangeOverflow";

/** InputNumber 越界详情。 */
export interface QuireKitNumberInputValueInvalid extends QuireKitNumberInputValueChange {
  /** 违反的范围约束。 */
  readonly reason: QuireKitNumberInputInvalidReason;
}
