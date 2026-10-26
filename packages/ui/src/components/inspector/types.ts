/** Inspector 的公开密度档位。 */
export type QuireKitInspectorSize = "sm" | "md";

/** 独立面板自带边界与底色；嵌入面板由宿主拥有外部 chrome。 */
export type QuireKitInspectorVariant = "standalone" | "embedded";

/** Inspector 顶部唯一状态通道表达的语义。 */
export type QuireKitInspectorStatus = "mixed" | "busy" | "disabled" | "error";

/** Inspector 默认槽获得的稳定状态。 */
export interface QuireKitInspectorSlotProps {
  /** 顶部状态通道当前表达的语义。 */
  readonly status: QuireKitInspectorStatus | undefined;
}
