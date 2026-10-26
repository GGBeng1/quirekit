/** ColorPicker、ColorPalette、ColorEditor 与文档色板的界面文案。 */
export interface Messages {
  /** 未提供 label 时触发器与颜色面板的可访问名称。 */
  readonly label: string;
  /** 当前颜色状态行的可见名称。 */
  readonly current: string;
  /** 最近使用分组名称。 */
  readonly recent: string;
  /** 预设色板分组名称。 */
  readonly palette: string;
  /** 未提供 resetLabel 时清除颜色动作的名称。 */
  readonly reset: string;
  /** 进入精确编辑器的动作与其浮层名称。 */
  readonly more: string;
  /** 精确颜色编辑器区域的可访问名称。 */
  readonly editor: string;
  /** 从精确编辑器返回快捷色板的动作。 */
  readonly back: string;
  /** 屏幕取色动作的名称。 */
  readonly eyedropper: string;
  /** 浏览器不支持屏幕取色时的提示。 */
  readonly eyedropperUnsupported: (action: string) => string;
  /** 饱和度与亮度区域的可访问名称。 */
  readonly area: string;
  /** 色相轨道的可访问名称。 */
  readonly hue: string;
  /** 透明度轨道的可访问名称。 */
  readonly alpha: string;
  /** 输入格式字段的可见名称。 */
  readonly format: string;
  /** 输入格式选择器的可访问名称。 */
  readonly formatLabel: string;
  /** HEX 颜色值字段的可见名称。 */
  readonly value: string;
  /** HEX 输入框的可访问名称。 */
  readonly hexValue: string;
  /** 文档色板的可访问名称。 */
  readonly documentPalette: string;
  /** 文档色板的默认颜色动作。 */
  readonly defaultColor: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  label: "选择颜色",
  current: "当前颜色",
  recent: "最近使用",
  palette: "预设颜色",
  reset: "无颜色",
  more: "更多颜色",
  editor: "精确颜色",
  back: "返回快捷颜色",
  eyedropper: "从屏幕取色",
  eyedropperUnsupported: action => `${action}（当前浏览器不支持）`,
  area: "饱和度与亮度",
  hue: "色相",
  alpha: "透明度",
  format: "格式",
  formatLabel: "颜色输入格式",
  value: "颜色值",
  hexValue: "HEX 颜色值",
  documentPalette: "颜色",
  defaultColor: "自动"
};

/** English. */
export const en: Messages = {
  label: "Choose color",
  current: "Current color",
  recent: "Recent colors",
  palette: "Preset colors",
  reset: "No color",
  more: "More colors",
  editor: "Custom color",
  back: "Back to colors",
  eyedropper: "Pick from screen",
  eyedropperUnsupported: action => `${action} (not supported in this browser)`,
  area: "Saturation and brightness",
  hue: "Hue",
  alpha: "Opacity",
  format: "Format",
  formatLabel: "Color input format",
  value: "Value",
  hexValue: "HEX color value",
  documentPalette: "Color",
  defaultColor: "Automatic"
};
