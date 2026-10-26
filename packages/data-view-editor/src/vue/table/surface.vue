<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from "vue";
import { QuireButton, QuireIconButton, QuireTable, QuirePagination, QuireIcon, QuireEmptyState } from "@quirekit/ui/vue";
import type { QuireKitTableColumn } from "@quirekit/ui";
import { queryDataTable, type DataOperation, type DataRecord, type DataSet, type DataTableView, type DataValue } from "@quirekit/data-view";
import Cell from "../cell/surface.vue";
import FieldMenu from "../fields/menu.vue";
import RecordMenu from "../controls/record-menu.vue";
import { useRecordActionFocus } from "../controls/focus";
import { tableSize } from "../shared/presentation";
import RecordDetailsTrigger from "../record/trigger.vue";
import { useColumnResize } from "./resize";
import { useTableNavigation } from "./navigation";
import type { CellMove } from "../cell/types";
import type { CellWriteReceipt } from "./types";
/** Bounded DOM over one complete query and aggregate result. */
interface Props {
  /** Complete source. */ readonly data: DataSet;
  /** Current table projection. */ readonly view: DataTableView;
  /** Record and schema mutation permission. */ readonly readOnly: boolean;
  /** Independent view configuration permission. */ readonly viewReadOnly?: boolean | undefined;
  /** Pending host commit. */ readonly busy?: boolean;
  /** Complete-data transient search. */ readonly search?: string;
  /** @param operations - Complete cell mutation. @returns Exact host or draft acknowledgement. */
  readonly mutate: (operations: readonly DataOperation[]) => boolean | Promise<boolean>;
}
const props = withDefaults(defineProps<Props>(), {viewReadOnly: undefined});
const emit = defineEmits<{apply: [operations: readonly DataOperation[]]; error: [message: string]; field: [id: string, trigger: HTMLElement]; change: [view: DataTableView]; add: []; detail: [id: string, trigger: HTMLElement]}>();
const pageNumber = ref(1);
const root = shallowRef<HTMLElement | null>(null);
const footer = shallowRef<HTMLElement | null>(null);
const focusRecord = useRecordActionFocus(() => footer.value, () => !!props.busy);
/** @param operations - Record menu action; focus follows its canonical result. */
function recordAction(operations: readonly DataOperation[]): void { emit("apply", operations); focusRecord(operations); }
watch(() => [props.view.query, props.data.records.length, props.search], () => { pageNumber.value = 1; });
// Pagination and cell-local editing reuse one full query result and its aggregates.
const result = computed(() => queryDataTable(props.data, {id: props.view.id, name: props.view.name, type: "table", visibleFieldIds: [], query: props.view.query, ...(props.view.summaries ? {summaries: props.view.summaries} : {})}, {search: props.search ?? ""}));
const rows = computed(() => result.value.records.slice((pageNumber.value - 1) * 50, pageNumber.value * 50));
const fields = computed(() => new Map(props.data.fields.map(field => [field.id, field])));
const size = computed(() => tableSize(props.view.density));
const navigate = useTableNavigation(() => root.value, () => rows.value, () => props.view.visibleFieldIds, () => !!props.busy, () => props.readOnly, () => props.data.id);
let lastWrite: CellWriteReceipt | undefined;
/** Captures the precise receipt before the synchronous navigation intent is emitted.
 * @param recordId - Stable row. @param fieldId - Stable column. @param value - Complete candidate.
 */
function changeCell(recordId: string, fieldId: string, value: DataValue): void {
  let receipt: Promise<boolean>;
  try { receipt = Promise.resolve(props.mutate([{type: "set-cell", recordId, fieldId, value}])).catch(failure => { emit("error", String(failure)); return false; }); }
  catch (failure) { emit("error", String(failure)); receipt = Promise.resolve(false); }
  const write = {recordId, fieldId, value, receipt}; lastWrite = write;
  void nextTick(() => { if (lastWrite === write) lastWrite = undefined; });
}
/** @param recordId - Current source row. @param fieldId - Current column. @param move - Cell's completed edit. @param event - Native keyboard event. */
function moveCell(recordId: string, fieldId: string, move: CellMove, event: KeyboardEvent): void {
  const write = lastWrite; lastWrite = undefined;
  navigate(recordId, fieldId, move, event, write?.recordId === recordId && write.fieldId === fieldId && write.value === move.value ? write.receipt : Promise.resolve(true));
}
const {preview, start: startResize, key: resizeKey} = useColumnResize(() => props.view, () => !!props.busy || (props.viewReadOnly ?? props.readOnly), view => emit("change", view), () => props.data);
/** @param id - Existing field. @returns Draft or canonical CSS pixel width. */
function width(id: string): number { return preview.value?.fieldId === id ? preview.value.width : props.view.columnWidths?.[id] ?? (id === props.data.primaryFieldId ? 280 : 160); }
const minWidth = computed(() => `calc(${props.view.visibleFieldIds.reduce((total, id) => total + width(id), 0)}px + ${props.readOnly ? 1 : 2} * var(--dv-control-height) + 2 * var(--dv-table-inset) + 2px)`);
const actionId = computed(() => { let id = "$actions"; while (fields.value.has(id)) id = `$${id}`; return id; });
const columns = computed<readonly QuireKitTableColumn<DataRecord>[]>(() => [
  ...props.view.visibleFieldIds.map(id => ({id, title: fields.value.get(id)!.name, width: `${width(id)}px`, align: fields.value.get(id)!.type === "number" ? "end" as const : "start" as const})),
  // This flexible action column absorbs spare viewport space, preserving the authored field widths.
  {id: actionId.value, title: ""}
]);
const summaries = computed(() => Object.entries(props.view.summaries ?? {}).map(([id, kind]) => ({id, field: fields.value.get(id)!.name, label: {count: "非空", sum: "合计", average: "平均"}[kind], value: result.value.summaries[id]})));
/** @param value - Finite aggregate or empty result. @returns Compact display retaining useful precision. */
function number(value: number | null | undefined): string { return value == null ? "—" : new Intl.NumberFormat("zh-CN", {maximumFractionDigits: 8}).format(value); }
</script>
<template>
  <div ref="root" class="dv-table-surface dv-control-geometry" :data-size="size" tabindex="-1">
    <QuireTable :rows="rows" :columns="columns" :size="size" row-key="id" :label="view.name" sticky-header max-height="54vh" :min-width="minWidth">
      <template #header="{ column }">
        <div v-if="fields.has(column.id)" class="dv-column-heading" :data-align="column.align">
          <FieldMenu :field="fields.get(column.id)!" :view="view" :size="size" :read-only="Boolean(viewReadOnly ?? readOnly)" :can-edit="!readOnly" :busy="busy" @edit="(id, trigger) => emit('field', id, trigger)" @change="emit('change', $event)" />
          <button v-if="!(viewReadOnly ?? readOnly)" type="button" class="dv-column-resizer" role="separator" aria-orientation="vertical" :aria-label="`调整${column.title}列宽`" :aria-valuenow="width(column.id)" :aria-valuetext="`${width(column.id)} 像素`" :aria-valuemin="80" :aria-valuemax="1200" :disabled="busy" @pointerdown="startResize($event, column.id, width(column.id))" @keydown="resizeKey($event, column.id, width(column.id))" />
        </div>
        <div v-else class="dv-column-add"><QuireIconButton v-if="!readOnly" label="添加字段" variant="outline" :size="size" :disabled="busy" @click="emit('field', '', $event.currentTarget as HTMLElement)"><QuireIcon name="plus" /></QuireIconButton><span class="dv-sr-only">记录操作</span></div>
      </template>
      <template #cell="{ row, column }">
        <div v-if="fields.has(column.id)" data-dv-table-cell :data-record-id="row.id" :data-field-id="column.id"><Cell :field="fields.get(column.id)!" :value="row.values[column.id]!" :primary="column.id === data.primaryFieldId" :read-only="readOnly" :disabled="busy" :size="size" grid :align="column.align === 'end' ? 'end' : 'start'" @change="changeCell(row.id, column.id, $event)" @error="emit('error', $event)" @move="(move, event) => moveCell(row.id, column.id, move, event)" /></div>
        <div v-else class="dv-record-actions"><RecordDetailsTrigger :record-id="row.id" :title="String(row.values[data.primaryFieldId] ?? '')" :size="size" @open="(id, trigger) => emit('detail', id, trigger)" /><RecordMenu v-if="!readOnly" :record="row" :title="String(row.values[data.primaryFieldId] ?? '')" :disabled="busy" :size="size" @apply="recordAction" /></div>
      </template>
      <template #empty><QuireEmptyState :title="search ? '没有匹配记录' : '暂无记录'" :scene="search ? 'search' : 'table'" size="sm" illustrated /></template>
    </QuireTable>
    <footer ref="footer" class="dv-table-footer">
      <QuireButton v-if="!readOnly" data-dv-add-record variant="ghost" :size="size" :disabled="busy" @click="emit('add')"><template #leading><QuireIcon name="plus" /></template>新增记录</QuireButton>
      <span class="dv-spacer" />
      <span class="dv-result-count" role="status">{{ result.total }} 条记录</span>
      <span v-for="item in summaries" :key="item.id" class="dv-statistic">{{ item.field }} · {{ item.label }} <strong>{{ number(item.value) }}</strong></span>
      <QuirePagination v-if="result.total > 50" v-model:page="pageNumber" :count="result.total" :page-size="50" :layout="['previous', 'pages', 'next']" label="数据记录分页" />
    </footer>
  </div>
</template>
