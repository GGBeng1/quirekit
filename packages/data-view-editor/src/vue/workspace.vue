<script setup lang="ts">
import { v4 as uuidv4 } from "uuid";
import { ref, shallowRef } from "vue";
import { QuireButton } from "@quirekit/ui/vue";
import type { DataViewSave, DataOperation } from "@quirekit/data-view";
import { blankDataRecord } from "../editing/values";
import { useDataViewWorkspace } from "../editing/workspace";
import type { DataViewWorkspaceProps } from "../types";
import Table from "./table/surface.vue";
import Board from "./board/surface.vue";
import Query from "./query/toolbar.vue";
import Fields from "./fields/editor.vue";
import FilterChips from "./query/chips.vue";
import Search from "./query/search.vue";
import Details from "./record/details.vue";
import ViewSelect from "./controls/view-select.vue";
import { useRecordDetails } from "./record/state";
import { useFieldTask } from "./fields/state";
import "./workspace.css";
const props = defineProps<DataViewWorkspaceProps>();
const emit = defineEmits<{apply: [save: DataViewSave]; cancel: []}>();
const {value, activeId, data, view, writable, canUndo, canRedo, error, loading, report, apply, replaceView, undo, redo, prepare} = useDataViewWorkspace(props);
const root = shallowRef<HTMLElement | null>(null), search = ref("");
const {recordId, open: openRecord, returnFocus} = useRecordDetails(() => data.value, () => root.value);
const {request: fieldTask, visible: fieldsOpen, open: openField, close: closeField, release: releaseField, anchor: fieldAnchor, returnFocus: fieldFocus} = useFieldTask({data: () => data.value, view: () => view.value, readOnly: () => !!props.readOnly || value.value.source.kind !== "inline", busy: () => !!props.busy, owner: () => root.value});
/** @param id - Existing field or creation. @param trigger - Surviving positioning entry. */
function editField(id: string, trigger: HTMLElement): void { error.value = ""; openField(id, trigger); }
/** Discards feedback with the transient field draft, unless the host is saving. */
function dismissField(): void { if (!props.busy) { error.value = ""; closeField(); } }
/** @param operations - Field changes and their same-step visibility. */
function applyFields(operations: readonly DataOperation[]): void {
  const task = fieldTask.value;
  if (!task || !fieldsOpen.value || task.data.id !== data.value?.id || task.data.revision !== data.value.revision) return;
  if (apply(operations, {showAddedFieldsIn: task.viewId})) closeField();
}
/** @param group - Optional board group for the new record. */
function add(group?: string | null): void {
  if (!data.value || !writable.value) return;
  const grouping = group !== undefined && view.value.type === "board" ? {fieldId: view.value.groupBy, value: group} : undefined;
  apply([{type: "insert-record", record: blankDataRecord(data.value, uuidv4(), grouping)}]);
}
/** Keeps undo local while the workspace owns focus.
 * @param event - Workspace keyboard event.
 */
function historyKey(event: KeyboardEvent): void {
  if (event.isComposing || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
  // Native text inputs keep their own uncommitted edit history.
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  event.preventDefault(); event.stopPropagation(); if (event.shiftKey) redo(); else undo();
}
</script>
<template>
  <section ref="root" class="dv-workspace" aria-label="多维表格工作区" tabindex="-1" @keydown="historyKey">
    <header class="dv-toolbar"><ViewSelect :model-value="view.id" :views="value.views" :busy="Boolean(busy)" @change="activeId = $event" />
      <span class="dv-spacer" /><QuireButton variant="ghost" :disabled="readOnly || busy || !canUndo" @click="undo">撤销</QuireButton><QuireButton variant="ghost" :disabled="readOnly || busy || !canRedo" @click="redo">重做</QuireButton>
      <QuireButton v-if="writable" variant="solid" color="primary" @click="add()">新增记录</QuireButton>
    </header>
    <p v-if="loading" role="status">正在加载数据…</p>
    <p v-if="value.source.kind !== 'inline'" class="dv-notice">外部数据以只读快照展示；应用仅保存视图配置。</p>
    <p v-if="error && !fieldsOpen" class="dv-error" role="alert">{{ error }}</p>
    <template v-if="data">
      <Search v-model="search" />
      <Query :data="data" :view="view" :read-only="Boolean(readOnly || busy)" :can-edit-fields="writable" @change="replaceView" @field="editField" />
      <FilterChips :data="data" :view="view" :read-only="Boolean(readOnly || busy)" @change="replaceView" />
      <div :key="view.id" role="region" :aria-label="view.name"><Table v-if="view.type === 'table'" :data="data" :view="view" :search="search" :read-only="!writable" :view-read-only="Boolean(readOnly || busy)" :busy="busy" :mutate="apply" @apply="apply" @error="report" @field="editField" @change="replaceView" @add="add()" @detail="openRecord" /><Board v-else :data="data" :view="view" :search="search" :read-only="!writable" :view-read-only="Boolean(readOnly || busy)" :busy="busy" @apply="apply" @error="report" @add="add" @change="replaceView" @detail="openRecord" /></div>
      <Details :data="data" :record-id="recordId" :read-only="!writable" :busy="busy" :error="error" :return-focus="returnFocus" @close="recordId = null" @apply="apply" @error="report" @history="historyKey" />
    </template>
    <Fields v-if="fieldTask" :key="fieldTask.key" :data="fieldTask.data" :field="fieldTask.field" :open="fieldsOpen" :busy="Boolean(busy)" :error="error" :anchor-el="fieldAnchor" :final-focus-el="fieldFocus" @apply="applyFields" @close="dismissField" @released="releaseField" />
    <footer class="dv-footer"><small>{{ data ? `${data.records.length} 条记录 · ${data.fields.length} 个字段` : '数据源引用已保留' }}</small><span class="dv-spacer" /><QuireButton variant="outline" :disabled="busy" @click="emit('cancel')">{{ readOnly ? '关闭' : '取消' }}</QuireButton><QuireButton v-if="!readOnly" variant="solid" color="primary" :disabled="busy || loading" :busy="busy" @click="emit('apply', prepare())">应用</QuireButton></footer>
  </section>
</template>
