/** 可排序的工具栏内置部件。scale 显示比例并恢复适应窗口。 */
export type QuireKitImagePreviewToolbarPart = 'zoomOut' | 'scale' | 'zoomIn' | 'fit' | 'rotateLeft' | 'rotateRight' | 'previous' | 'counter' | 'next' | 'separator' | 'actions';
/** 由 toolbar-item 插槽渲染的具名自定义位置。 */
export interface QuireKitImagePreviewToolbarSlot {
  /** 稳定且唯一的插槽位置名称。 */ readonly slot: string;
}
/** 工具栏数组中的一个位置，数组顺序也是键盘 Tab 顺序。 */
export type QuireKitImagePreviewToolbarLayoutItem = QuireKitImagePreviewToolbarPart | QuireKitImagePreviewToolbarSlot;
/** 标准看图、精简缩放和带组内翻页的三组预设。 */
export type QuireKitImagePreviewToolbarPreset = 'standard' | 'compact' | 'gallery';
/** 工具栏组合配置；显式 layout 完全替换预设布局。 */
export interface QuireKitImagePreviewToolbarOptions {
  /** 预设名称，默认 standard。 */ readonly preset?: QuireKitImagePreviewToolbarPreset;
  /** 按顺序显示部件；空数组隐藏工具栏，separator 可重复使用。 */ readonly layout?: readonly QuireKitImagePreviewToolbarLayoutItem[];
}
/** 兼容开关，同时接受预设名称和布局配置。 */
export type QuireKitImagePreviewToolbar = boolean | QuireKitImagePreviewToolbarPreset | QuireKitImagePreviewToolbarOptions;
