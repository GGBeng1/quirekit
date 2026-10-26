<script setup lang="ts" generic="Row">
import { computed, useId } from "vue";
import { getCoreRowModel, useVueTable } from "@tanstack/vue-table";
import type { QuireKitTableCellContext, QuireKitTableHeaderContext, QuireKitTableProps, QuireKitTableSorting } from "../../components/table";
import { QuireScrollArea } from "../scroll-area";
import { QuireEmptyState } from "../empty-state";
import { tableColumns } from "./model";
import { useTableInteraction } from "./use-table-interaction";
import { QuireButton } from "../button";
import { QuireCheckbox } from "../checkbox";
import { QuireIcon } from "../icon";
import ChoiceFieldItem from "../shared/choice-state/field-item.vue";
import { useQuireKitMessages } from "../locale-provider/context";

const props = withDefaults(defineProps<QuireKitTableProps<Row>>(), {
  size: "sm", loading: false, stickyHeader: false, sortingMode: "manual", selectable: false,
  minWidth: "100%", maxHeight: "none"
});
const emit = defineEmits<{
  /** Requested single-column ordering. */
  "update:sorting": [value: QuireKitTableSorting | null];
  /** Business keys retained across pages. */
  "update:selectedKeys": [value: string[]];
}>();
const selectionId = useId();
const { rows, ids, selectedSet, enabledKeys, enabledSet, pageChecked, select, headerContext } = useTableInteraction(props, value => emit("update:sorting", value), value => emit("update:selectedKeys", value));
const text = useQuireKitMessages("table");
/**
 * @param row - Original host row.
 * @param key - Stable row identity fallback.
 * @returns Accessible name of the row's selection checkbox.
 */
function rowSelectionLabel(row: Row, key: string): string {
  return text.value.selectRow(props.rowLabel?.(row) ?? key);
}
defineSlots<{
  /** Generic fallback for every body cell. */
  cell?: (context: QuireKitTableCellContext<Row>) => unknown;
  /** Generic fallback for every header. */
  header?: (context: QuireKitTableHeaderContext<Row>) => unknown;
  /** First-load content, rendered without discarding existing rows. */
  loading?: () => unknown;
  /** Empty content after loading finishes. */
  empty?: () => unknown;
  /** External pagination or summary, outside the scrolling viewport. */
  footer?: () => unknown;
  /** Per-column body and header slots override their generic counterparts. */
  [name: `cell-${string}`]: ((context: QuireKitTableCellContext<Row>) => unknown) | undefined;
  /** Named column heading slots. */
  [name: `header-${string}`]: ((context: QuireKitTableHeaderContext<Row>) => unknown) | undefined;
}>();
const columns = computed(() => tableColumns(props.columns));
// Local sorting is explicit and precedes this display model; paging remains host-owned.
const table = useVueTable<Row>({
  get data() { return [...rows.value]; },
  get columns() { return columns.value; },
  getRowId: (_row, index) => ids.value[index]!,
  getCoreRowModel: getCoreRowModel()
});
const displayed = computed(() => table.getRowModel().rows);
const viewportStyle = computed(() => ({ "--qk-table-max-height": props.maxHeight }));
</script>

<template>
  <div :class="['qk-table', `qk-table--${size}`]" :style="viewportStyle" :aria-busy="loading">
    <div v-if="loading" class="qk-table__status" role="status">{{ text.loading }}</div>
    <QuireScrollArea :axis="maxHeight === 'none' ? 'horizontal' : 'both'" :label="text.scrollArea(label || caption || text.table)" viewport-class="qk-table__viewport">
      <table class="qk-table__table" :style="{ minWidth }" :aria-label="label" :aria-labelledby="labelledby" :aria-busy="loading">
        <caption v-if="caption" class="qk-table__caption">{{ caption }}</caption>
        <colgroup><col v-if="selectable" class="qk-table__selection-column"><col v-for="column in props.columns" :key="column.id" :style="{ width: column.width }"></colgroup>
        <thead><tr>
          <th v-if="selectable" scope="col" style="text-align: start" :class="['qk-table__heading', { 'qk-table__heading--sticky': stickyHeader }]">
            <ChoiceFieldItem :value="`${selectionId}-page`"><QuireCheckbox :label="text.selectPage" :size="size" :checked="pageChecked" :disabled="loading || !enabledKeys.length" @update:checked="select(enabledKeys, $event === true)"><span class="sr-only">{{ text.selectPage }}</span></QuireCheckbox></ChoiceFieldItem>
          </th>
          <th v-for="column in props.columns" :key="column.id" scope="col" :aria-sort="headerContext(column).direction === 'asc' ? 'ascending' : headerContext(column).direction === 'desc' ? 'descending' : undefined" :class="['qk-table__heading', { 'qk-table__heading--sticky': stickyHeader }]" :style="{ textAlign: column.align || 'start' }">
            <slot :name="`header-${column.id}`" v-bind="headerContext(column)"><slot name="header" v-bind="headerContext(column)">
              <QuireButton v-if="headerContext(column).sortable" class="qk-table__sort" :size="size" :disabled="loading" @click="headerContext(column).toggleSorting()">{{ column.title }}<template #trailing><QuireIcon :name="headerContext(column).direction === 'asc' ? 'arrowUp' : headerContext(column).direction === 'desc' ? 'arrowDown' : 'arrowUpDown'" /></template></QuireButton>
              <template v-else>{{ column.title }}</template>
            </slot></slot>
          </th>
        </tr></thead>
        <tbody>
          <tr v-for="row in displayed" :key="row.id" :data-row-key="row.id" :data-selected="selectable && selectedSet.has(row.id) ? '' : undefined" :data-current="currentRowKey != null && String(currentRowKey) === row.id ? '' : undefined" :class="['qk-table__row', { 'qk-table__row--selectable': selectable }]">
            <td v-if="selectable" class="qk-table__cell"><ChoiceFieldItem :value="`${selectionId}-${row.id}`"><QuireCheckbox :label="rowSelectionLabel(row.original, row.id)" :size="size" :checked="selectedSet.has(row.id)" :disabled="loading || !enabledSet.has(row.id)" @update:checked="select([row.id], $event === true)"><span class="sr-only">{{ rowSelectionLabel(row.original, row.id) }}</span></QuireCheckbox></ChoiceFieldItem></td>
            <component :is="column.rowHeader ? 'th' : 'td'" v-for="column in props.columns" :key="column.id" :scope="column.rowHeader ? 'row' : undefined" class="qk-table__cell" :style="{ textAlign: column.align || 'start' }">
              <slot :name="`cell-${column.id}`" :row="row.original" :column="column" :value="row.getValue(column.id)" :size="size"><slot name="cell" :row="row.original" :column="column" :value="row.getValue(column.id)" :size="size">{{ row.getValue(column.id) ?? '—' }}</slot></slot>
            </component>
          </tr>
          <tr v-if="!displayed.length"><td :colspan="Math.max(1, props.columns.length + (selectable ? 1 : 0))" class="qk-table__empty">
            <slot v-if="loading" name="loading" />
            <slot v-else name="empty"><QuireEmptyState :title="text.empty" scene="table" size="sm" illustrated /></slot>
          </td></tr>
        </tbody>
      </table>
    </QuireScrollArea>
    <div v-if="$slots.footer" class="qk-table__footer"><slot name="footer" /></div>
  </div>
</template>
