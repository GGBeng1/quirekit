/** EmptyState 的内容密度档位。 */
export type QuireKitEmptyStateSize = "sm" | "md";

/** 内置占位插图的可选图案。 */
export type QuireKitEmptyStateScene = "data" | "search" | "create" | "documents" | "chart" | "table";

/** EmptyState 在宿主文档结构中可使用的标题层级。 */
export type QuireKitEmptyStateHeadingLevel = 2 | 3 | 4 | 5 | 6;

/** EmptyState 内容插槽获得的稳定展示上下文。 */
export interface QuireKitEmptyStateSlotProps {
  /** 当前内容密度，供自定义插图或动作选择相应尺寸。 */
  readonly size: QuireKitEmptyStateSize;
  /** 当前选择的插图图案。 */
  readonly scene: QuireKitEmptyStateScene;
}
