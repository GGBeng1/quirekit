import type { QuireKitControlSize } from "../control";

/** RadioGroup 公开排列方向。 */
export type QuireKitRadioGroupOrientation = "horizontal" | "vertical";

/** RadioGroup 公开尺寸。 */
export type QuireKitRadioGroupSize = QuireKitControlSize;

/** 一个稳定 radio 选项的公开合同。 */
export interface QuireKitRadioGroupItem {
  /** 原生表单提交与选中状态使用的稳定值。 */
  readonly value: string;
  /** 可见并参与点击目标的标签。 */
  readonly label: string;
  /** 标签下方的可选说明。 */
  readonly description?: string;
  /** 是否只禁用当前选项。 */
  readonly disabled?: boolean;
}
