import type { QuireKitControlSize } from "../control";
/** Textarea 公开的排版尺寸。 */
export type QuireKitTextareaSize = QuireKitControlSize;

/** Textarea 允许调用方选择的原生缩放方向。 */
export type QuireKitTextareaResize = "none" | "vertical" | "both";

/** outline 自带输入边界；embedded 由复合容器承担边界和焦点反馈。 */
export type QuireKitTextareaVariant = "outline" | "embedded";

/** Textarea 的公开实例能力。 */
export interface QuireKitTextareaInstance {
  /** 聚焦原生输入，不改变当前值或选区。
   * @param options - 原生焦点滚动选项。
   */
  focus(options?: FocusOptions): void;
}
