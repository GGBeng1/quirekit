import type { QuireKitControlSize } from "../control";
/** Input 公开的控件尺寸。 */
export type QuireKitInputSize = QuireKitControlSize;

/** Input 支持的原生文本输入类型。 */
export type QuireKitInputType =
  | "text"
  | "email"
  | "password"
  | "search"
  | "tel"
  | "url";

/** 文本 Input 的公开属性。 */
export interface QuireKitInputProps {
  /** Whether a nonempty editable value exposes a clear action. */
  readonly clearable?: boolean;
  /** 受控文本值。 */
  readonly modelValue?: string;
  /** 非受控模式的初始文本值。 */
  readonly defaultValue?: string;
  /** 原生文本输入类型。 */
  readonly type?: QuireKitInputType;
  /** 密码输入是否显示显隐按钮，默认 true；其他输入类型忽略。 */
  readonly visibilityToggle?: boolean;
  /** 受控密码可见性，支持 v-model:visible；其他输入类型忽略。 */
  readonly visible?: boolean | undefined;
  /** 非受控密码的初始可见性，默认 false。 */
  readonly defaultVisible?: boolean;
  /** 控件高度和排版尺寸。 */
  readonly size?: QuireKitInputSize;
  /** 控件的 CSS 宽度。 */
  readonly width?: string | number;
  /** 输入文字的逻辑对齐方向。 */
  readonly textAlign?: "start" | "center" | "end";
  /** 空值提示；省略时按字段标签和输入类型生成本地化提示，空字符串关闭提示。 */
  readonly placeholder?: string | undefined;
  /** 原生字段名。 */
  readonly name?: string;
  /** 关联的 form id。 */
  readonly form?: string;
  /** 浏览器自动完成提示。 */
  readonly autocomplete?: string;
  /** 是否禁用输入。 */
  readonly disabled?: boolean;
  /** 是否显示错误状态。 */
  readonly invalid?: boolean;
  /** 是否要求表单提交一个值。 */
  readonly required?: boolean;
  /** 是否允许聚焦但禁止修改。 */
  readonly readOnly?: boolean;
  /** 最少允许的字符数。 */
  readonly minlength?: number;
  /** 最多允许的字符数。 */
  readonly maxlength?: number;
  /** 原生输入格式约束。 */
  readonly pattern?: string;
}
