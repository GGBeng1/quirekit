import type { QuireKitControlSize, QuireKitListDensity } from '../../components/control';
/** Shared identity and readable navigation content. */
export interface NavigationMenuEntry {
  /** Stable key, unique throughout the whole tree. */
  key: string;
  /** Visible accessible name. */
  label: string;
  /** Supporting text, primarily useful inside panels. */
  description?: string;
  /** Disables this entry and all of its descendants. */
  disabled?: boolean;
}
/** A real destination or a static informational entry. */
export interface QuireKitNavigationMenuLink extends NavigationMenuEntry {
  /** Native URL; absent or empty values render a static span. */
  href?: string;
  /** Native browsing context. */
  target?: string;
  /** Native relationship; blank-window links default to noopener noreferrer. */
  rel?: string;
  /** Links never simultaneously act as expansion triggers. */
  children?: never;
}
/** A category expanded independently of browser navigation. */
export interface QuireKitNavigationMenuGroup extends NavigationMenuEntry {
  /** Ordered destinations and nested categories. */
  children: readonly QuireKitNavigationMenuItem[];
  /** Put a category landing page in an explicit child link. */
  href?: never;
}
/** Ordered, host-owned navigation hierarchy. */
export type QuireKitNavigationMenuItem = QuireKitNavigationMenuLink | QuireKitNavigationMenuGroup;
/** Public navigation layout and activation policy. */
export interface QuireKitNavigationMenuProps {
  /** 导航数据；每个 key 在整棵树中唯一。 */
  items: readonly QuireKitNavigationMenuItem[];
  /** 导航区域的可访问名称，用于区分多个导航；省略时取自语言包。 */
  ariaLabel?: string;
  /** horizontal 为顶部面板，vertical 为侧栏分组。 */
  orientation?: 'horizontal' | 'vertical';
  /** 横向面板使用单列 list 或图文 grid；grid 在窄空间自动单列。 */
  panelLayout?: 'list' | 'grid';
  /** 当前页面的 key，不改变展开状态。 */
  currentKey?: string;
  /** 初始展开项；横向只使用第一个有效一级分组。 */
  defaultValue?: string[];
  /** 横向顶层控件尺寸，默认 sm。 */
  size?: QuireKitControlSize;
  /** 侧栏和子导航的独立密度，默认 regular。 */
  density?: QuireKitListDensity;
  /** 禁止整组导航跳转与展开。 */
  disabled?: boolean;
  /** 弹层的成套开关策略：click 或 hover；内联分组始终点击展开。 */
  trigger?: 'click' | 'hover';
  /** 是否显示当前项的中性背景，默认 true；关闭后保留文字强调。 */
  highlight?: boolean;
  /** 将纵向侧栏收起为图标栏，通过侧向弹层访问子导航。 */
  collapsed?: boolean;
  /** 图标栏悬停或聚焦时显示名称提示，默认 true。 */
  tooltip?: boolean;
}
/** Static adornments inside the original link or trigger. */
export interface QuireKitNavigationMenuSlotProps {
  /** Original entry. */
  item: QuireKitNavigationMenuItem;
  /** Whether the entry itself is the current destination. */
  current: boolean;
}
/** Shared content slots forwarded through every hierarchy level. */
export interface NavigationMenuSlots {
  /** 标签前的静态图标。 */
  leading?: (props: QuireKitNavigationMenuSlotProps) => unknown;
  /** 标签后的静态计数或提示。 */
  trailing?: (props: QuireKitNavigationMenuSlotProps) => unknown;
}
