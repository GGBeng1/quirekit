/** 一个可选择的视觉预设。 */
export interface QuireKitPresetGalleryItem {
  /** 用于选择和渲染的稳定唯一值。 */
  readonly value: string;
  /** 预设的可见名称与可访问名称。 */
  readonly label: string;
  /** 预设说明。 */
  readonly description?: string;
  /** 是否禁止用户选择此预设。 */
  readonly disabled?: boolean;
  /** 传给预览插槽的自定义数据。 */
  readonly data?: Readonly<Record<string, unknown>>;
}

/** 预览插槽提供的项目与状态。 */
export interface QuireKitPresetGalleryItemSlotProps {
  /** 当前预设。 */
  readonly item: QuireKitPresetGalleryItem;
  /** 当前预设是否已选中。 */
  readonly selected: boolean;
  /** 当前预设是否高亮。 */
  readonly highlighted: boolean;
  /** 当前预设是否禁用。 */
  readonly disabled: boolean;
}
