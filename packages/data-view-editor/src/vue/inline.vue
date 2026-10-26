<script setup lang="ts">
import { v4 as uuidv4 } from "uuid";
import { computed, ref, shallowRef, watch } from "vue";
import { QuireButton, QuireIcon } from "@quirekit/ui/vue";
import { applyDataViewOperations, readDataView, replaceDataView, serializeDataView, type DataOperation, type DataView, type DataViewEmbed, type DataViewMutationOptions } from "@quirekit/data-view";
import type { DataViewInlineProps } from "../types";
import { blankDataRecord } from "../editing/values";
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

const props = defineProps<DataViewInlineProps>();
const activeId = ref(props.value.defaultViewId), error = ref(""), busy = ref(false);
const root = shallowRef<HTMLElement | null>(null), search = ref("");
const data = computed(() => props.value.source.kind === "inline" ? props.value.source.dataset : null);
const {recordId, open: openRecord, returnFocus} = useRecordDetails(() => data.value, () => root.value);
watch([() => props.value.id, () => data.value?.id], () => { search.value = ""; recordId.value = null; });
const view = computed(() => props.value.views.find(item => item.id === activeId.value) ?? props.value.views[0]!);
const writable = computed(() => !props.readOnly && !busy.value && !!data.value);
const {request: fieldTask, visible: fieldsOpen, open: openField, close: closeField, release: releaseField, anchor: fieldAnchor, returnFocus: fieldFocus} = useFieldTask({data: () => data.value, view: () => view.value, readOnly: () => !!props.readOnly, busy: () => busy.value, owner: () => root.value});
watch(() => props.value.defaultViewId, id => { activeId.value = id; });

/** @param failure - Validation or persistence failure. */
function report(failure: unknown): void { error.value = failure instanceof Error ? failure.message : String(failure); }
/** Sends one complete value, then follows the host's canonical props.
 * @param next - Proposed full snapshot.
 * @returns Whether the document accepted the change.
 */
async function save(next: DataViewEmbed): Promise<boolean> {
  if (props.readOnly || busy.value) return false;
  const base = serializeDataView(props.value);
  if (base === serializeDataView(next)) return true;
  busy.value = true; error.value = "";
  try {
    const result = await props.commit({base, value: next});
    if (!result.accepted) error.value = result.message ?? "未能保存，请重新编辑。";
    return result.accepted;
  } catch (failure) { report(failure); return false; }
  finally { busy.value = false; }
}
/** @param operations - Complete schema or record operations. @param options - Atomic view changes. @returns Whether the exact write was accepted. */
async function apply(operations: readonly DataOperation[], options?: DataViewMutationOptions): Promise<boolean> {
  if (!writable.value || !data.value) return false;
  try {
    const next = applyDataViewOperations(props.value, operations, {baseRevision: data.value.revision, revision: uuidv4()}, options);
    return await save(next);
  } catch (failure) { report(failure); return false; }
}
/** @param id - Existing field or creation. @param trigger - Surviving positioning entry. */
function editField(id: string, trigger: HTMLElement): void { error.value = ""; openField(id, trigger); }
/** Discards a field task's local feedback with its unsaved draft. */
function dismissField(): void { if (!busy.value) { error.value = ""; closeField(); } }
/** @param operations - Complete field edit associated with the opening source and view. */
async function applyFields(operations: readonly DataOperation[]): Promise<void> {
  const task = fieldTask.value;
  if (!task || !fieldsOpen.value || task.data.id !== data.value?.id || task.data.revision !== data.value.revision) return;
  if (await apply(operations, {showAddedFieldsIn: task.viewId}) && fieldTask.value === task) closeField();
}
/** @param next - Authored view settings. */
async function configure(next: DataView): Promise<void> {
  try { await save(replaceDataView(props.value, next)); } catch (failure) { report(failure); }
}
/** @param id - View selected by pointer or keyboard. */
async function activate(id: string): Promise<void> {
  if (busy.value || id === view.value.id || !props.value.views.some(item => item.id === id)) return;
  activeId.value = id;
  if (!props.readOnly && !await save(readDataView({...props.value, defaultViewId: id}))) activeId.value = props.value.defaultViewId;
}
/** @param group - Optional board column for a new record. */
function add(group?: string | null): void {
  if (!data.value) return;
  const grouping = group !== undefined && view.value.type === "board" ? {fieldId: view.value.groupBy, value: group} : undefined;
  void apply([{type: "insert-record", record: blankDataRecord(data.value, uuidv4(), grouping)}]);
}
/** Keeps input undo native and routes non-input history to the document.
 * @param event - Keyboard event from this surface.
 */
function history(event: KeyboardEvent): void {
  if (event.isComposing || event.defaultPrevented || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
  if ((event.target as Element | null)?.closest("input,textarea")) return;
  const action = event.shiftKey ? props.redo : props.undo;
  if (!props.readOnly && action) { event.preventDefault(); event.stopPropagation(); action(); }
}
</script>
<template>
  <section ref="root" class="dv-workspace dv-inline" data-qk-not-prose aria-label="多维表格" tabindex="-1" @keydown="history">
    <header class="dv-toolbar">
      <ViewSelect :model-value="view.id" :views="value.views" :busy="busy" @change="activate" />
      <span class="dv-spacer" />
      <Search v-if="data" v-model="search" />
      <Query v-if="data" :data="data" :view="view" :read-only="Boolean(readOnly || busy)" @change="configure" @field="editField" />
      <QuireButton v-if="data && !readOnly" class="dv-add-record" variant="soft" color="primary" :disabled="busy" @click="add()"><template #leading><QuireIcon name="plus" /></template>新增记录</QuireButton>
    </header>
    <p v-if="error && !fieldsOpen" class="dv-error" role="alert">{{ error }}</p>
    <template v-if="data">
      <FilterChips :data="data" :view="view" :read-only="Boolean(readOnly || busy)" @change="configure" />
      <div :key="view.id" role="region" :aria-label="view.name">
        <Table v-if="view.type === 'table'" :data="data" :view="view" :search="search" :read-only="Boolean(readOnly)" :busy="busy" :mutate="apply" @apply="apply" @error="report" @field="editField" @change="configure" @add="add()" @detail="openRecord" />
        <Board v-else :data="data" :view="view" :search="search" :read-only="Boolean(readOnly)" :busy="busy" @apply="apply" @error="report" @add="add" @change="configure" @detail="openRecord" />
      </div>
      <footer v-if="view.type === 'board'" class="dv-inline-summary"><span>{{ search ? '全部 ' : '' }}{{ data.records.length }} 条记录 · {{ data.fields.length }} 个字段</span><span v-if="readOnly">只读</span></footer>
      <Details :data="data" :record-id="recordId" :read-only="Boolean(readOnly)" :busy="busy" :error="error" :return-focus="returnFocus" @close="recordId = null" @apply="apply" @error="report" @history="history" />
    </template>
    <p v-else class="dv-empty">外部数据引用已保留，需要宿主配置数据源后加载。</p>
    <Fields v-if="fieldTask" :key="fieldTask.key" :data="fieldTask.data" :field="fieldTask.field" :open="fieldsOpen" :busy="busy" :error="error" :anchor-el="fieldAnchor" :final-focus-el="fieldFocus" @apply="applyFields" @close="dismissField" @released="releaseField" />
  </section>
</template>
