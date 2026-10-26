/** ScrollArea 可以启用的滚动轴。 */
export type QuireKitScrollAreaAxis = "horizontal" | "vertical" | "both";

/** ScrollArea 自定义滚动条的显示策略。 */
export type QuireKitScrollAreaVisibility = "always" | "auto";

/** ScrollArea 滚动条的视觉尺寸。 */
export type QuireKitScrollAreaSize = "sm" | "md";

/** ScrollArea 对外报告的规范滚动位置。 */
export interface QuireKitScrollAreaPosition {
  /** viewport 从内容起始侧滚动的水平距离。 */
  readonly x: number;
  /** viewport 从内容顶部滚动的垂直距离。 */
  readonly y: number;
}

/** ScrollArea 可以直接定位的内容边缘。 */
export type QuireKitScrollAreaEdge = "top" | "right" | "bottom" | "left";
