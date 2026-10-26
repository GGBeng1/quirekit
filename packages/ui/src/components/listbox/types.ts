/** Listbox 的值选择策略。 */
export type QuireKitListboxSelectionMode = "single" | "multiple" | "extended";

/** 列表使用线性导航，网格使用二维导航。 */
export type QuireKitListboxLayout = "list" | "grid";

/** 一个可持续选择的稳定候选。 */
export interface QuireKitListboxItem {
  /** 非空且在当前集合内唯一的选择值。 */
  readonly value: string;
  /** 默认可见名称，同时用于可访问名称和 typeahead。 */
  readonly label: string;
  /** 名称下的可选补充说明。 */
  readonly description?: string;
  /** 是否禁止新增此项选择。 */
  readonly disabled?: boolean;
  /** 列表模式的可选组名，按首次出现的顺序排列。 */
  readonly group?: string;
}

/** 自定义选项的公开状态；根 option 始终由 Listbox 持有。 */
export interface QuireKitListboxItemSlotProps {
  /** 当前稳定选项。 */
  readonly item: QuireKitListboxItem;
  /** 当前选项是否在选择模型中。 */
  readonly selected: boolean;
  /** 当前选项是否为键盘高亮候选；不表示已选。 */
  readonly highlighted: boolean;
  /** 当前选项或整个 Listbox 是否被禁用。 */
  readonly disabled: boolean;
}

/** 可见分组及其内部稳定顺序。 */
export interface QuireKitListboxGroup {
  /** 当前组名；未分组选项为 undefined。 */
  readonly label: string | undefined;
  /** 组内候选，保持输入的相对顺序。 */
  readonly items: readonly QuireKitListboxItem[];
}

/** 值更新后报告的已选集合。 */
export interface QuireKitListboxValueChangeDetails {
  /** 完整选择值，包含过滤时暂时不可见的选择。 */
  readonly value: readonly string[];
  /** 对应的已知候选；只传入值且候选从未出现时，可能缺少该项。 */
  readonly items: readonly QuireKitListboxItem[];
}

/** 高亮变化与值选择分开的公开反馈。 */
export interface QuireKitListboxHighlightChangeDetails {
  /** 当前高亮值，没有高亮时为 null。 */
  readonly highlightedValue: string | null;
  /** 当前高亮候选，没有高亮时为 null。 */
  readonly highlightedItem: QuireKitListboxItem | null;
  /** 高亮在可见选项中的位置，没有高亮时为 -1。 */
  readonly highlightedIndex: number;
}
