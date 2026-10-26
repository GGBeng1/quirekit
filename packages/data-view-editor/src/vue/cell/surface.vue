<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch, type PropType } from "vue";
import { QuireButton, QuireInput, QuireSelect, QuireCheckbox, QuireInputNumber, QuireDateInput, QuireTextarea } from "@quirekit/ui/vue";
import type { QuireKitControlSize } from "@quirekit/ui";
import type { DataField, DataValue } from "@quirekit/data-view";
import { displayDataValue, parseCellInput } from "../../editing/values";
import Value from "./value.vue";
import type { CellDirection, CellMove } from "./types";
// Disable Boolean prop casting: an empty text cell must remain an empty string.
const props = defineProps({field: {type: Object as PropType<DataField>, required: true}, value: {type: null as unknown as PropType<DataValue>, required: true}, primary: {type: Boolean, required: true}, readOnly: {type: Boolean, required: true}, disabled: Boolean, grid: Boolean, multiline: Boolean, size: {type: String as PropType<QuireKitControlSize>, default: "sm"}, align: {type: String as PropType<"start" | "end">, default: "start"}});
const emit = defineEmits<{change: [value: DataValue]; error: [message: string]; move: [intent: CellMove, event: KeyboardEvent]}>();
const editing = ref(false), inputRoot = shallowRef<HTMLElement | null>(null), text = ref("");
const choices = computed(() => [{value: "$null", label: "未设置"}, ...(props.field.type === "singleSelect" ? props.field.options.map(option => ({value: `option:${option.id}`, label: option.label})) : [{value: "true", label: "是"}, {value: "false", label: "否"}])]);
const selected = computed(() => props.value === null ? "$null" : props.field.type === "boolean" ? String(props.value) : `option:${props.value}`);
const multiple = ref<readonly string[]>([]);
const isMultiline = computed(() => props.multiline && props.field.type === "text" && !props.primary);
const root = shallowRef<HTMLElement | null>(null);
let focusAfterEdit = false;
/** Restores the cell action after a complete edit, once the host accepts input again. */
function restoreFocus(): void {
  focusAfterEdit = true;
  void nextTick(() => {
    if (!focusAfterEdit || props.disabled) return;
    root.value?.querySelector<HTMLElement>("button")?.focus(); focusAfterEdit = false;
  });
}
watch(() => props.disabled, disabled => { if (!disabled && focusAfterEdit) restoreFocus(); });
// A source update or permission change invalidates an uncommitted cell edit.
watch(() => [props.value, props.readOnly, props.field.type], () => { editing.value = false; });
/** Begins a component-owned input without publishing an incomplete value. */
async function begin(): Promise<void> {
  if (props.readOnly || props.disabled) return;
  text.value = props.value === null ? "" : String(props.value); editing.value = true;
  multiple.value = Array.isArray(props.value) ? [...props.value] : [];
  await nextTick(); inputRoot.value?.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, button')?.focus();
}
/** @param value - Complete typed value. */
function finish(value: DataValue): void {
  if (!editing.value || props.readOnly || props.disabled) return;
  editing.value = false;
  const unchanged = Array.isArray(value) && Array.isArray(props.value)
    ? value.length === props.value.length && value.every((id, index) => id === (props.value as readonly string[])[index])
    : value === props.value;
  if (!unchanged) emit("change", value);
}
/** Publishes complete text after the input component ends composition.
 * @returns Complete candidate, or undefined when the edit must remain open.
 */
function commit(): {value: DataValue} | undefined {
  if (!editing.value || props.readOnly || props.disabled) return;
  try { const value = parseCellInput(props.field, text.value, props.primary); finish(value); return {value}; }
  catch (error) { emit("error", error instanceof Error ? error.message : String(error)); }
}
/** @param value - Semantic component choice. */
function select(value: string | undefined): void {
  if (value !== undefined) { finish(value === "$null" ? null : props.field.type === "boolean" ? value === "true" : value.slice(7)); restoreFocus(); }
}
/** Allows a synchronous value event to complete before closing its editor.
 * @param open - Public Select open state.
 */
function selectOpen(open: boolean | undefined): void {
  if (open === false) void nextTick(() => {
    const document = root.value?.ownerDocument, active = document?.activeElement;
    const returnToCell = !active || active === document?.body || inputRoot.value?.contains(active);
    editing.value = false;
    if (returnToCell) restoreFocus();
  });
}
/** @param id - Option identity. @param checked - Desired state. */
function toggle(id: string, checked: boolean): void { multiple.value = checked ? [...multiple.value.filter(value => value !== id), id] : multiple.value.filter(value => value !== id); }
/** Publishes the complete multi-choice edit as one undoable operation. */
function finishMultiple(): void { finish(multiple.value); restoreFocus(); }
/** Native composition owns Enter; Escape cancels only this cell.
 * @param event - Input keyboard event.
 */
function key(event: KeyboardEvent): void {
  if (event.isComposing || event.keyCode === 229) return;
  if (event.key === "Enter" && (!isMultiline.value || event.ctrlKey || event.metaKey)) {
    event.preventDefault(); event.stopPropagation();
    const complete = commit();
    if (complete) { if (props.grid) emit("move", {direction: event.shiftKey ? "up" : "down", value: complete.value}, event); else restoreFocus(); }
  }
  if (event.key === "Tab" && props.grid) {
    const complete = commit();
    if (complete) emit("move", {direction: event.shiftKey ? "previous" : "next", value: complete.value}, event);
    else { event.preventDefault(); event.stopPropagation(); }
  }
  if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); editing.value = false; restoreFocus(); }
}
/** Requests navigation only from the display action, leaving field widgets' keys native.
 * @param event - Display button keyboard event.
 */
function actionKey(event: KeyboardEvent): void {
  if (!props.grid || props.disabled || event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey) return;
  const arrows: Readonly<Record<string, CellDirection>> = {ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right"};
  const direction: CellDirection | undefined = event.key === "Tab" ? event.shiftKey ? "previous" : "next"
    : arrows[event.key];
  if (direction) emit("move", {direction, value: props.value}, event);
}
</script>
<template>
  <div ref="root" class="dv-cell dv-control-geometry" :data-size="size" :data-align="align">
  <span v-if="readOnly" class="dv-cell-text"><Value :field="field" :value="value" /></span>
  <div v-else-if="editing" ref="inputRoot" class="dv-cell-editor">
    <div v-if="field.type === 'multiSelect'" class="dv-multi" @keydown.esc.prevent.stop="editing = false; restoreFocus()"><QuireCheckbox v-for="option in field.options" :key="option.id" :label="option.label" :disabled="disabled" :checked="multiple.includes(option.id)" @update:checked="toggle(option.id, $event === true)" /><QuireButton variant="soft" :size="size" @click="finishMultiple">完成</QuireButton></div>
    <QuireSelect v-else-if="field.type === 'singleSelect' || field.type === 'boolean'" :size="size" :disabled="disabled" :label="field.name" :items="choices" :model-value="selected" :open="true" width="100%" @value-change="select" @update:open="selectOpen" />
    <QuireInputNumber v-else-if="field.type === 'number'" v-model="text" :size="size" :disabled="disabled" :label="field.name" width="100%" @focus-change="!$event.focused && commit()" @keydown="key" />
    <QuireDateInput v-else-if="field.type === 'date'" :size="size" :disabled="disabled" :model-value="typeof value === 'string' ? value : null" :label="field.name" clearable @update:model-value="finish($event)" @keydown.esc.stop="editing = false; restoreFocus()" />
    <QuireTextarea v-else-if="isMultiline" v-model="text" :size="size" :disabled="disabled" :aria-label="field.name" :rows="4" auto-resize :max-rows="12" width="100%" @blur="commit" @keydown="key" />
    <QuireInput v-else v-model="text" :size="size" :disabled="disabled" :aria-label="field.name" :placeholder="field.type === 'datetime' ? '2026-10-18T09:00:00+08:00' : undefined" width="100%" @blur="commit" @keydown="key" />
  </div>
  <QuireButton v-else variant="ghost" :size="size" class="dv-cell-action" :disabled="disabled" :aria-label="`编辑${field.name}：${displayDataValue(field, value)}`" @click="begin" @keydown="actionKey"><span class="dv-cell-content"><Value :field="field" :value="value" /></span></QuireButton>
  </div>
</template>
