import type { QuireKitMenuEntry, QuireKitMenuLength } from "../types";

/** Preferred direction for a Menu-family floating surface. */
export type QuireKitContextMenuPlacement =
  | "bottom-start" | "bottom-end" | "top-start" | "top-end"
  | "left-start" | "left-end" | "right-start" | "right-end";

/** Public properties for the Menu family's local context-menu entry. */
export interface QuireKitContextMenuProps {
  /** Declarative menu entries; an explicit default slot replaces them. */
  readonly items?: readonly QuireKitMenuEntry[];
  /** 组件的稳定标识；省略时自动生成。 */
  readonly id?: string;
  /** 可聚焦操作区域的 DOM id。 */
  readonly triggerId?: string;
  /** 操作区域与菜单共用的可访问名称。 */
  readonly label: string;
  /** 未控制 open 时的初始打开状态。 */
  readonly defaultOpen?: boolean;
  /** 是否禁止打开自定义上下文菜单。 */
  readonly disabled?: boolean;
  /** 选择普通条目后是否关闭菜单。 */
  readonly closeOnSelect?: boolean;
  /** 方向键是否在首尾条目之间循环。 */
  readonly loopFocus?: boolean;
  /** 是否通过字符键查找匹配的可用条目。 */
  readonly typeahead?: boolean;
  /** 首选位置；空间不足时自动调整。 */
  readonly placement?: QuireKitContextMenuPlacement;
  /** 是否把菜单传送到页面 body。 */
  readonly portalled?: boolean;
  /** 关闭后是否返回操作区域；用户已聚焦其他控件时保留新焦点。 */
  readonly restoreFocus?: boolean;
  /** 菜单宽度；auto 表示按内容调整。 */
  readonly width?: QuireKitMenuLength;
  /** 菜单最小宽度。 */
  readonly minWidth?: QuireKitMenuLength;
  /** 菜单最大宽度；超出的标签显示省略号。 */
  readonly maxWidth?: QuireKitMenuLength;
}

/** 操作区域插槽提供的状态。 */
export interface QuireKitContextMenuSlotProps {
  /** 菜单是否已打开。 */
  readonly open: boolean;
  /** 是否禁止打开自定义菜单。 */
  readonly disabled: boolean;
}
