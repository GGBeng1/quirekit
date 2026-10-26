/** Fieldset 内容的排列方向。 */
export type QuireKitFieldsetOrientation = "vertical" | "horizontal";

/** Fieldset 的视觉外观。 */
export type QuireKitFieldsetAppearance = "outline" | "plain";

/** Fieldset 当前公开给插槽的语义状态。 */
export interface QuireKitFieldsetSlotProps {
  /** 分组是否处于校验错误状态。 */
  readonly invalid: boolean;
  /** 分组及其原生表单控件是否已禁用。 */
  readonly disabled: boolean;
  /** 当前内容排列方向。 */
  readonly orientation: QuireKitFieldsetOrientation;
}
