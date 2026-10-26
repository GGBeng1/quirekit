/** Progress 的几何呈现。 */
export type QuireKitProgressShape = "linear" | "circle" | "spinner";

/** Progress 的视觉尺寸。 */
export type QuireKitProgressSize = "sm" | "md" | "lg";

/** Progress 的语义色。 */
export type QuireKitProgressTone = "primary" | "info" | "success" | "warning" | "danger";

/** Progress 内容插槽接收的稳定上下文。 */
export interface QuireKitProgressSlotProps {
  /** 当前数值；null 表示不确定进度。 */
  readonly value: number | null;
  /** 相对有效 min/max 的百分比；不确定进度为 0。 */
  readonly percent: number;
  /** 已格式化的数值，或不确定状态的本地化文案。 */
  readonly valueText: string;
  /** 当前是否为不确定进度。 */
  readonly indeterminate: boolean;
}

/** Progress 数值变化后的公开详情。 */
export interface QuireKitProgressValueChangeDetails {
  /** 变化后的数值；null 表示不确定进度。 */
  readonly value: number | null;
}
