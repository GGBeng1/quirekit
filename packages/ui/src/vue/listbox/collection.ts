import { createGridCollection, createListCollection } from "@ark-ui/vue/collection";
import type { GridCollection, ListCollection } from "@ark-ui/vue/collection";
import type {
  QuireKitListboxGroup,
  QuireKitListboxItem,
  QuireKitListboxLayout
} from "../../components/listbox";

/**
 * 按首次组名组织可见项，使 DOM 和 collection 消费完全相同的顺序。
 *
 * @param items - 宿主提供的当前可见候选。
 * @returns 按首次组名排序、组内稳定的候选分组。
 */
export function groupListboxItems(items: readonly QuireKitListboxItem[]): QuireKitListboxGroup[] {
  const groups = new Map<string | undefined, QuireKitListboxItem[]>();
  for (const item of items) {
    const group = groups.get(item.group) ?? [];
    group.push(item);
    groups.set(item.group, group);
  }
  return [...groups].map(([label, entries]) => ({ label, items: entries }));
}

/**
 * 校验稳定标识与布局约束，把导航权威委托给 Ark 的 collection。
 *
 * @param items - 已按实际 DOM 分组顺序排列的可见候选。
 * @param layout - 线性列表或二维网格。
 * @param columnCount - 网格视觉布局对应的正整数列数。
 * @param loopFocus - 是否使未显式提供 loop 的网格行导航沿当前列环回。
 * @returns 供同一个 Ark Listbox Root 使用的集合。
 */
export function createListboxCollection(
  items: readonly QuireKitListboxItem[],
  layout: QuireKitListboxLayout,
  columnCount: number,
  loopFocus = false
): ListCollection<QuireKitListboxItem> | GridCollection<QuireKitListboxItem> {
  const values = new Set<string>();
  for (const item of items) {
    if (item.value.trim() === "" || values.has(item.value)) {
      throw new Error("QuireListbox items require non-empty, unique values.");
    }
    if (layout === "grid" && item.group !== undefined) {
      throw new Error("QuireListbox grid layout does not support grouped items.");
    }
    values.add(item.value);
  }
  const options = {
    items: [...items],
    itemToValue: (item: QuireKitListboxItem) => item.value,
    itemToString: (item: QuireKitListboxItem) => item.label,
    isItemDisabled: (item: QuireKitListboxItem) => item.disabled === true
  };
  if (layout === "list") return createListCollection(options);
  if (!Number.isInteger(columnCount) || columnCount < 1) {
    throw new Error("QuireListbox columnCount must be a positive integer.");
  }
  const grid = createGridCollection({ ...options, columnCount });
  const nextRow = grid.getNextRowValue;
  const previousRow = grid.getPreviousRowValue;
  // Zag 1.43.3 omits loopFocus when calling these public methods; retain its selection machine.
  /**
   * @param value - 当前高亮值。
   * @param loop - 显式策略，省略时使用列表的 loopFocus。
   * @returns 由 GridCollection 计算的下一行可用值。
   */
  grid.getNextRowValue = (value, loop = loopFocus) => nextRow(value, loop);
  /**
   * @param value - 当前高亮值。
   * @param loop - 显式策略，省略时使用列表的 loopFocus。
   * @returns 由 GridCollection 计算的上一行可用值。
   */
  grid.getPreviousRowValue = (value, loop = loopFocus) => previousRow(value, loop);
  return grid;
}

/**
 * 阻止上游批量选择新增禁用项，同时保留已存在但暂时不可编辑的选择。
 *
 * @param proposed - Ark 本次提出的完整选择。
 * @param current - 宿主已经持有的选择。
 * @param items - 当前可见选项及其禁用状态。
 * @returns 去重且不包含新增禁用项的选择值。
 */
export function filterListboxSelection(
  proposed: readonly string[],
  current: readonly string[],
  items: readonly QuireKitListboxItem[]
): string[] {
  const disabled = new Set(items.filter(item => item.disabled).map(item => item.value));
  const selected = new Set(current);
  return [...new Set(proposed)].filter(value => !disabled.has(value) || selected.has(value));
}
