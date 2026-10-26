/** Avatar 的视觉尺寸。 */
export type QuireKitAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

/** Avatar 的外轮廓。 */
export type QuireKitAvatarShape = "circle" | "square";

/** Avatar 旁显示的人员状态。 */
export type QuireKitAvatarStatus = "none" | "online" | "away" | "busy" | "offline";

/** Ark Avatar 图片加载状态。 */
export type QuireKitAvatarLoadStatus = "error" | "loaded";

/** Avatar 图片加载状态变化详情。 */
export interface QuireKitAvatarStatusChangeDetails {
  /** 图片已加载或加载失败。 */
  readonly status: QuireKitAvatarLoadStatus;
}

/** Avatar fallback 插槽上下文。 */
export interface QuireKitAvatarFallbackSlotProps {
  /** Avatar 对应的完整名称。 */
  readonly name: string;
  /** 组件计算后的回退短文本。 */
  readonly fallback: string;
}

/** Avatar status 插槽上下文。 */
export interface QuireKitAvatarStatusSlotProps {
  /** 当前状态。 */
  readonly status: Exclude<QuireKitAvatarStatus, "none">;
  /** 当前状态的本地化名称。 */
  readonly label: string;
}

/** Avatar Group 的一个成员。 */
export interface QuireKitAvatarGroupItem {
  /** 列表中的稳定标识。 */
  readonly id: string;
  /** 成员名称。 */
  readonly name: string;
  /** 可选头像地址。 */
  readonly src?: string | undefined;
  /** 可选回退短文本。 */
  readonly fallback?: string | undefined;
  /** 可选在线状态。 */
  readonly status?: QuireKitAvatarStatus | undefined;
}

/** Avatar Group item 插槽上下文。 */
export interface QuireKitAvatarGroupItemSlotProps {
  /** 当前成员数据。 */
  readonly item: QuireKitAvatarGroupItem;
  /** 当前成员在可见列表中的索引。 */
  readonly index: number;
  /** Group 统一下发的视觉尺寸。 */
  readonly size: QuireKitAvatarSize;
}

/** Avatar Group overflow 插槽上下文。 */
export interface QuireKitAvatarGroupOverflowSlotProps {
  /** 未直接显示的成员数量。 */
  readonly count: number;
}
