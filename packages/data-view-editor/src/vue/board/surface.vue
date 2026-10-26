<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import { QuireButton, QuireIcon, QuireIconButton, QuireTag } from "@quirekit/ui/vue";
import { groupDataSet, type DataBoardView, type DataOperation, type DataSet } from "@quirekit/data-view";
import Cell from "../cell/surface.vue";
import RecordMenu from "../controls/record-menu.vue";
import { useRecordActionFocus } from "../controls/focus";
import { optionColor } from "../shared/presentation";
import RecordDetailsTrigger from "../record/trigger.vue";
/** Grouped records share canonical data; folding changes only the projection. */
interface Props {
  /** Complete dataset. */ readonly data: DataSet;
  /** Board projection. */ readonly view: DataBoardView;
  /** Record mutation permission. */ readonly readOnly: boolean;
  /** Independent view configuration permission. */ readonly viewReadOnly?: boolean | undefined;
  /** Pending host acknowledgement. */ readonly busy?: boolean;
  /** Transient complete-data search shared with the table. */ readonly search?: string;
}
const props = withDefaults(defineProps<Props>(), {viewReadOnly: undefined});
const emit = defineEmits<{apply: [operations: readonly DataOperation[]]; error: [message: string]; add: [group: string | null]; change: [view: DataBoardView]; detail: [id: string, trigger: HTMLElement]}>();
const columnPage = ref(0), cardPage = ref(0), dragging = ref<string | null>(null), dropGroup = ref<string | null | undefined>();
const root = shallowRef<HTMLElement | null>(null);
const focusRecord = useRecordActionFocus(() => root.value, () => !!props.busy);
/** @param operations - Record action whose menu may disappear when committed. */
function recordAction(operations: readonly DataOperation[]): void { emit("apply", operations); focusRecord(operations); }
watch(() => [props.view.groupBy, props.view.query, props.data.records.length, props.search], () => { columnPage.value = 0; cardPage.value = 0; });
const groups = computed(() => groupDataSet(props.data, props.view, {offset: cardPage.value * 50, limit: 50, ...(props.search ? {search: props.search} : {})}));
const columns = computed(() => groups.value.slice(columnPage.value * 8, columnPage.value * 8 + 8));
const fields = computed(() => props.view.visibleFieldIds.map(id => props.data.fields.find(field => field.id === id)!).filter(field => field.id !== props.data.primaryFieldId && field.id !== props.view.groupBy));
const groupField = computed(() => props.data.fields.find(field => field.id === props.view.groupBy)!);
/** @param group - Stable option or unassigned identity. @returns Its label color. */
function color(group: string | null) {
  const option = groupField.value.type === "singleSelect" ? groupField.value.options.find(item => item.id === group) : undefined;
  return option ? optionColor(option) : "neutral";
}
/** @param group - Stable column identity. @returns Whether only its heading is shown. */
function collapsed(group: string | null): boolean { return props.view.collapsedGroups?.includes(group) ?? false; }
/** @param group - Explicitly toggled column. */
function toggle(group: string | null): void {
  if (props.busy || (props.viewReadOnly ?? props.readOnly)) return;
  emit("change", {...props.view, collapsedGroups: collapsed(group) ? props.view.collapsedGroups!.filter(id => id !== group) : [...props.view.collapsedGroups ?? [], group]});
}
/** @param group - Target group, accepts only this board's initiated drag. */
function drop(group: string | null): void {
  if (!props.readOnly && !props.busy && dragging.value && props.data.records.some(record => record.id === dragging.value)) emit("apply", [{type: "set-cell", recordId: dragging.value, fieldId: props.view.groupBy, value: group}]);
  dragging.value = null; dropGroup.value = undefined;
}
/** @param event - Native drag start. @param id - Stable record ID. */
function start(event: DragEvent, id: string): void {
  if (props.readOnly || props.busy) { event.preventDefault(); return; }
  dragging.value = id; event.dataTransfer?.setData("text/plain", id); if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
}
</script>
<template>
  <div ref="root" class="dv-board" :aria-label="view.name">
    <section v-for="group in columns" :key="group.key === null ? 'unassigned' : `option:${group.key}`" class="dv-column" :class="{'dv-column-collapsed': collapsed(group.key), 'dv-column-drop': dragging && dropGroup === group.key}" @dragover.prevent="dropGroup = group.key" @dragleave="dropGroup = undefined" @drop.prevent="drop(group.key)">
      <header><QuireIconButton :label="`${collapsed(group.key) ? '展开' : '折叠'}分组：${group.label}`" :aria-expanded="!collapsed(group.key)" variant="ghost" size="xs" :disabled="busy || (viewReadOnly ?? readOnly)" @click="toggle(group.key)"><QuireIcon :name="collapsed(group.key) ? 'chevronRight' : 'chevronDown'" /></QuireIconButton><QuireTag :color="color(group.key)" variant="soft">{{ group.label }}</QuireTag><span class="dv-count">{{ group.total }}</span><QuireIconButton v-if="!readOnly && !collapsed(group.key)" :disabled="busy" variant="ghost" size="xs" :label="`${group.label}：新增记录`" @click="emit('add', group.key)"><QuireIcon name="plus" /></QuireIconButton></header>
      <template v-if="!collapsed(group.key)">
        <article v-for="record in group.records" :key="record.id" class="dv-card">
          <div class="dv-card-top"><span v-if="!readOnly" role="img" aria-label="拖动卡片到另一列" :draggable="!busy" class="dv-drag" @dragstart="start($event, record.id)" @dragend="dragging = null; dropGroup = undefined"><QuireIcon name="gripVertical" :size="16" /></span>
            <Cell :field="data.fields.find(field => field.id === data.primaryFieldId)!" :value="record.values[data.primaryFieldId]!" :primary="true" :read-only="readOnly" :disabled="busy" @change="emit('apply', [{type: 'set-cell', recordId: record.id, fieldId: data.primaryFieldId, value: $event}])" @error="emit('error', $event)" />
            <RecordMenu v-if="!readOnly" :record="record" :title="String(record.values[data.primaryFieldId] ?? '')" :disabled="busy" size="sm" @apply="recordAction" />
            <RecordDetailsTrigger :record-id="record.id" :title="String(record.values[data.primaryFieldId] ?? '')" @open="(id, trigger) => emit('detail', id, trigger)" />
          </div>
          <div v-for="field in fields" :key="field.id" class="dv-card-field"><small v-if="view.showFieldNames !== false">{{ field.name }}</small><Cell :field="field" :value="record.values[field.id]!" :primary="false" :read-only="readOnly" :disabled="busy" @change="emit('apply', [{type: 'set-cell', recordId: record.id, fieldId: field.id, value: $event}])" @error="emit('error', $event)" /></div>
          <div v-if="!readOnly" class="dv-card-field"><small v-if="view.showFieldNames !== false">{{ groupField.name }}</small><Cell :field="groupField" :value="record.values[view.groupBy]!" :primary="false" :read-only="false" :disabled="busy" @change="emit('apply', [{type: 'set-cell', recordId: record.id, fieldId: view.groupBy, value: $event}])" @error="emit('error', $event)" /></div>
        </article>
        <p v-if="!group.records.length" class="dv-empty">{{ group.total ? '本页没有记录' : '暂无记录' }}</p>
        <QuireButton v-if="!readOnly" data-dv-add-record class="dv-board-add" variant="ghost" :disabled="busy" :aria-label="`${group.label}：新增卡片`" @click="emit('add', group.key)"><template #leading><QuireIcon name="plus" /></template>新增记录</QuireButton>
      </template>
    </section>
  </div>
  <p v-if="search" class="dv-search-summary" role="status">{{ groups.reduce((total, group) => total + group.total, 0) }} 条匹配记录</p>
  <div v-if="cardPage > 0 || columns.some(group => group.nextOffset !== null) || groups.length > 8" class="dv-page"><span>每列第 {{ cardPage + 1 }} 页 · 每页 50 条</span><QuireButton variant="ghost" :disabled="cardPage === 0" @click="cardPage--">上一页卡片</QuireButton><QuireButton variant="ghost" :disabled="!columns.some(group => group.nextOffset !== null)" @click="cardPage++">下一页卡片</QuireButton>
    <QuireButton v-if="groups.length > 8" variant="ghost" :disabled="columnPage === 0" @click="columnPage--; cardPage = 0">前 8 列</QuireButton><QuireButton v-if="groups.length > 8" variant="ghost" :disabled="(columnPage + 1) * 8 >= groups.length" @click="columnPage++; cardPage = 0">后 8 列</QuireButton>
  </div>
</template>
