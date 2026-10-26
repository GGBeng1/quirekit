import { computed, shallowRef } from "vue";
import type { QuireKitTableColumn, QuireKitTableHeaderContext, QuireKitTableSorting } from "../../components/table";
import type { TableInteractionProps } from "./types";
import { tableRowIds } from "./model";
import { changeTableSelection, tablePageChecked } from "./selection";
import { nextTableSorting, resolveTableSorting, sortTableRows, tableColumnSortable } from "./sorting";

/**
 * Coordinates explicit sort ownership and page-scoped selection.
 * @param props - Reactive public table configuration.
 * @param onSorting - Emits a requested sort state without overriding controlled props.
 * @param onSelectedKeys - Emits selected business keys, including off-page keys.
 * @returns Display rows, accessible header contexts and selection actions.
 */
export function useTableInteraction<Row>(props: TableInteractionProps<Row>, onSorting: (value: QuireKitTableSorting | null) => void, onSelectedKeys: (value: string[]) => void) {
  const localSorting = shallowRef(props.defaultSorting ?? null);
  const localKeys = shallowRef<readonly string[]>([...props.defaultSelectedKeys ?? []]);
  const sorting = computed(() => resolveTableSorting(props.columns, props.sorting === undefined ? localSorting.value : props.sorting));
  const selectedKeys = computed(() => props.selectedKeys ?? localKeys.value);
  const selectedSet = computed(() => new Set(selectedKeys.value));
  const rows = computed(() => props.sortingMode === "local" ? sortTableRows(props.rows, props.columns, sorting.value) : props.rows);
  const ids = computed(() => tableRowIds(rows.value, props.rowKey));
  const enabledKeys = computed(() => ids.value.filter((_key, index) => props.rowSelectable?.(rows.value[index]!) !== false));
  const enabledSet = computed(() => new Set(enabledKeys.value));
  const pageChecked = computed(() => tablePageChecked(enabledKeys.value, selectedKeys.value));

  /**
   * Requests the next sorting state for one enabled header.
   * @param column - Activated public column.
   */
  function toggleSorting(column: QuireKitTableColumn<Row>): void {
    if (props.loading || !tableColumnSortable(column)) return;
    const next = nextTableSorting(sorting.value, column.id);
    if (props.sorting === undefined) localSorting.value = next;
    onSorting(next);
  }

  /**
   * Provides identical contracts to generic and named header slots.
   * @param column - Heading's column definition.
   * @returns Explicit control state and action.
   */
  function headerContext(column: QuireKitTableColumn<Row>): QuireKitTableHeaderContext<Row> {
    return {
      column, direction: sorting.value?.columnId === column.id ? sorting.value.direction : null,
      sortable: tableColumnSortable(column), disabled: Boolean(props.loading),
      toggleSorting: () => toggleSorting(column), size: props.size ?? "sm"
    };
  }

  /**
   * Changes only enabled targets on this page; controlled state waits for the host.
   * @param keys - Requested business keys.
   * @param checked - Add or remove selection.
   */
  function select(keys: readonly string[], checked: boolean): void {
    if (!props.selectable || props.loading) return;
    const next = changeTableSelection(selectedKeys.value, keys.filter(key => enabledSet.value.has(key)), checked);
    if (props.selectedKeys === undefined) localKeys.value = next;
    onSelectedKeys(next);
  }
  return { rows, ids, sorting, selectedKeys, selectedSet, enabledKeys, enabledSet, pageChecked, select, headerContext };
}
