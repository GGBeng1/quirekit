import type { QuireKitControlSize } from "../control";
/** Tabs 的排列方向。 */
export type QuireKitTabsOrientation = "horizontal" | "vertical";

/** Tabs 的公开尺寸。 */
export type QuireKitTabsSize = QuireKitControlSize;

/** Tabs 的选中触发方式。 */
export type QuireKitTabsActivationMode = "automatic" | "manual";

/** 一个稳定页签及其面板的公开合同。 */
export interface QuireKitTabsItem {
  /** 页签、面板关联和 v-model 使用的稳定值。 */
  readonly value: string;
  /** Existing panel id when the owning application places panels outside Tabs. */
  readonly panelId?: string;
  /** 页签的可见名称。 */
  readonly label: string;
  /** 未提供 content 插槽时显示的面板文本。 */
  readonly content?: string;
  /** 是否禁止聚焦和选择当前页签。 */
  readonly disabled?: boolean;
}
