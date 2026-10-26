/** TreeView 的选择模式。 */
export type QuireKitTreeViewSelectionMode = "single" | "multiple";

/** TreeView 选中节点的公开视觉方式。 */
export type QuireKitTreeViewSelectionAppearance = "background" | "text";

/** TreeView 中一个稳定节点的框架无关合同。 */
export interface QuireKitTreeNode {
  /** 节点稳定标识，同时作为展开、选择和焦点值。 */
  readonly id: string;
  /** 未提供插槽时显示的默认文本。 */
  readonly label: string;
  /** 已经可用的直接子节点。 */
  readonly children?: readonly QuireKitTreeNode[];
  /** 子节点总数；用于声明尚未加载子节点的异步分支。 */
  readonly childrenCount?: number;
  /** 是否禁止节点的展开与选择交互。 */
  readonly disabled?: boolean;
  /** 供业务插槽读取的附加只读数据。 */
  readonly data?: Readonly<Record<string, unknown>>;
}

/** branch 与 item 插槽接收的稳定节点上下文。 */
export interface QuireKitTreeViewNodeSlotProps {
  /** 当前节点合同。 */
  readonly node: QuireKitTreeNode;
  /** 当前节点在树中的索引路径。 */
  readonly indexPath: readonly number[];
  /** 当前节点从 1 开始的可访问层级。 */
  readonly depth: number;
  /** 当前节点是否为分支。 */
  readonly isBranch: boolean;
  /** 当前分支是否展开。 */
  readonly expanded: boolean;
  /** 当前节点是否被选择。 */
  readonly selected: boolean;
  /** 当前节点是否拥有 roving focus。 */
  readonly focused: boolean;
  /** 当前节点是否被禁用。 */
  readonly disabled: boolean;
  /** 当前分支是否正在异步加载。 */
  readonly loading: boolean;
}

/** TreeView 展开状态变化后的公开详情。 */
export interface QuireKitTreeViewExpandedChangeDetails {
  /** 当前全部展开节点的稳定标识。 */
  readonly expandedValue: readonly string[];
  /** 变化后拥有焦点的节点标识。 */
  readonly focusedValue: string | null;
}

/** TreeView 选择状态变化后的公开详情。 */
export interface QuireKitTreeViewSelectionChangeDetails {
  /** 当前全部已选择节点的稳定标识。 */
  readonly selectedValue: readonly string[];
  /** 变化后拥有焦点的节点标识。 */
  readonly focusedValue: string | null;
}

/** TreeView 异步子节点加载失败的公开详情。 */
export interface QuireKitTreeViewLoadErrorDetails {
  /** 加载失败的节点。 */
  readonly node: QuireKitTreeNode;
  /** 加载函数抛出的错误。 */
  readonly error: Error;
}

/** TreeView 异步子节点加载函数。 */
export type QuireKitTreeViewLoadChildren = (
  node: QuireKitTreeNode,
  signal: AbortSignal
) => Promise<readonly QuireKitTreeNode[]>;
