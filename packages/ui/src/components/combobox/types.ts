import type { QuireKitListDensity } from "../control";
import type { HTMLAttributes } from "vue";
import type { QuireKitControlSize } from "../control";
/** Combobox 公开的控件尺寸。 */
export type QuireKitComboboxSize = QuireKitControlSize;

/** Combobox 浮层的首选方位。 */
export type QuireKitComboboxPlacement =
  | "bottom-start"
  | "bottom-end"
  | "top-start"
  | "top-end";

/** Combobox 浮层可选的视觉边界强度。 */
export type QuireKitComboboxBorder = "none" | "subtle" | "default";

/** Combobox 触发器或浮层接受的 CSS 宽度。 */
export type QuireKitComboboxLength = string | number;

/** Combobox 内建的本地过滤策略。 */
export type QuireKitComboboxFilter = "contains" | "startsWith" | "none";

/** 一个可搜索并提交的 Combobox 选项。 */
export interface QuireKitComboboxItem {
  /** 提交给 v-model 与原生表单的稳定值。 */
  readonly value: string;
  /** 选项的可见名称和输入完成文本。 */
  readonly label: string;
  /** 帮助区分同名或相近结果的次级说明。 */
  readonly description?: string;
  /** 参与本地过滤但不直接显示的同义关键词。 */
  readonly keywords?: readonly string[];
  /** 列表模式的可选组名，按首次出现的顺序排列。 */
  readonly group?: string;
  /** 是否禁止选择当前选项。 */
  readonly disabled?: boolean;
}

/** 可搜索单选表单控件的公开属性。 */
export interface QuireKitComboboxProps {
  /** 受控浮层状态；省略时内部管理。 */
  readonly open?: boolean | undefined;
  /** 投影到传送后内容的实例主题、语言及所有权。 */
  readonly contentProps?: HTMLAttributes;
  /** 是否显示搜索图标；紧凑可编辑选择可隐藏。 */
  readonly showSearchIcon?: boolean;
  /** 受控的单个语义值。 */
  readonly modelValue?: string | null;
  /** 非受控模式的初始值。 */
  readonly defaultValue?: string;
  /** 受控的可见输入文本。 */
  readonly inputValue?: string;
  /** 非受控模式的初始输入文本。 */
  readonly defaultInputValue?: string;
  /** 按稳定顺序参与搜索和渲染的选项。 */
  readonly items: readonly QuireKitComboboxItem[];
  /** 尚未输入或选择时显示的提示；省略时取自语言包。 */
  readonly placeholder?: string;
  /** 输入框和列表的可访问名称。 */
  readonly label: string;
  /** 控件高度和排版尺寸。 */
  readonly size?: QuireKitComboboxSize;
  /** 控件外观；text 无常驻边框，悬停或聚焦时显示，适合工具栏。默认 outline。 */
  readonly variant?: "outline" | "text";
  /** Independent list density; defaults to compact for xs/sm triggers and regular otherwise. */
  readonly contentDensity?: QuireKitListDensity;
  /** 输入控件的 CSS 宽度。 */
  readonly width?: QuireKitComboboxLength;
  /** 浮层的独立 CSS 宽度；省略时跟随输入控件。 */
  readonly contentWidth?: QuireKitComboboxLength;
  /** 浮层的可选边界强度；默认不显示边框。 */
  readonly border?: QuireKitComboboxBorder;
  /** 浮层的首选方位。 */
  readonly placement?: QuireKitComboboxPlacement;
  /** 内建的本地过滤策略；none 用于服务端结果。 */
  readonly filter?: QuireKitComboboxFilter;
  /** 是否正在等待异步结果。 */
  readonly loading?: boolean;
  /** 是否允许输入不在 items 中的自定义值。 */
  readonly allowCustomValue?: boolean;
  /** 是否在点击输入框时立即打开结果列表。 */
  readonly openOnClick?: boolean;
  /** 是否显示可清除当前输入和值的按钮。 */
  readonly clearable?: boolean;
  /** 是否把浮层传送到 body。 */
  readonly portalled?: boolean;
  /** 是否禁用整个控件。 */
  readonly disabled?: boolean;
  /** 是否以错误状态呈现。 */
  readonly invalid?: boolean;
  /** 是否要求原生表单提交一个值。 */
  readonly required?: boolean;
  /** 是否允许聚焦但禁止修改值。 */
  readonly readOnly?: boolean;
  /** 原生表单字段名。 */
  readonly name?: string;
  /** 原生字段关联的 form id。 */
  readonly form?: string;
}

/** 自定义选项内容时获得的稳定上下文。 */
export interface QuireKitComboboxItemSlotProps {
  /** 当前渲染的选项。 */
  readonly item: QuireKitComboboxItem;
}

/** Combobox 过滤后的可见分组。 */
export interface QuireKitComboboxGroup {
  /** 当前组名；未分组选项为 undefined。 */
  readonly label: string | undefined;
  /** 组内候选，保持输入的相对顺序。 */
  readonly items: readonly QuireKitComboboxItem[];
}

/** Combobox 的可替换内容位置。 */
export interface QuireKitComboboxSlots {
  /** 替换选项的可见内容，保留可访问名称。 */
  readonly item?: (props: QuireKitComboboxItemSlotProps) => unknown;
  /** 替换组标题，不替换分组与选项语义。 */
  readonly groupLabel?: (props: QuireKitComboboxGroup) => unknown;
  /** 替换无匹配结果的状态内容。 */
  readonly empty?: () => unknown;
  /** 替换异步加载状态内容。 */
  readonly loading?: () => unknown;
}
