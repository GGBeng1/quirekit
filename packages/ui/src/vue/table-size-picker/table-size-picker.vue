<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import QuireButton from "../button/button.vue";
import QuireField from "../field/field.vue";
import QuireInputNumber from "../input-number/input-number.vue";
import { tableQuickGridSize, isTableGridCellHighlighted, moveTableGridSelection, normalizeTableSize } from "../../components/table-size-picker/model";
import type { QuireTableSize, QuireTableSizePickerProps, TableGridKey } from "../../components/table-size-picker/types";

const props = withDefaults(defineProps<QuireTableSizePickerProps>(), { maxDimension: 63 });
const emit = defineEmits<{ select: [size: QuireTableSize]; cancel: [] }>();
const panel = ref<HTMLElement>();
const limit = computed(() => Number.isInteger(props.maxDimension) && props.maxDimension > 0 ? props.maxDimension : 63);
const gridRows = computed(() => Math.min(tableQuickGridSize.rowCount, limit.value));
const gridColumns = computed(() => Math.min(tableQuickGridSize.columnCount, limit.value));
const initial = normalizeTableSize(props.initialSize?.rowCount ?? null, props.initialSize?.columnCount ?? null, limit.value) ?? { rowCount: 2, columnCount: 2 };
const active = ref<QuireTableSize>({ rowCount: Math.min(gridRows.value, Math.max(1, initial.rowCount)), columnCount: Math.min(gridColumns.value, Math.max(1, initial.columnCount)) });
const custom = ref(false);
const keyboard = ref(false);
const rows = ref<number | null>(active.value.rowCount);
const columns = ref<number | null>(active.value.columnCount);
const size = computed(() => normalizeTableSize(rows.value, columns.value, limit.value));
/** Focuses the one roving tab stop after the panel or mode becomes visible. */
function focusCell(): void {
  panel.value?.querySelector<HTMLButtonElement>(`[data-table-row="${active.value.rowCount}"][data-table-column="${active.value.columnCount}"]`)?.focus({ preventScroll: true });
}
/** @param rowCount - One-based row. @param columnCount - One-based column. */
function activate(rowCount: number, columnCount: number): void { active.value = { rowCount, columnCount }; }
/** @param event - Focus arriving from a keyboard or a pointer-opened menu. @param row - One-based row. @param column - One-based column. */
function focus(event: FocusEvent, row: number, column: number): void {
  activate(row, column);
  const target = event.target as HTMLElement;
  keyboard.value = target.ownerDocument.documentElement.dataset.qkModality !== "pointer" && target.matches(":focus-visible");
}
/** @param value - Complete tuple to emit after validating host bounds. */
function commit(value: QuireTableSize): void {
  if (!props.disabled && normalizeTableSize(value.rowCount, value.columnCount, limit.value)) emit("select", value);
}
/** @param event - Keyboard input owned by the roving grid. */
function navigate(event: KeyboardEvent): void {
  keyboard.value = true;
  if (["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp", "End", "Home"].includes(event.key)) {
    event.preventDefault();
    active.value = moveTableGridSelection(active.value, event.key as TableGridKey, event.ctrlKey || event.metaKey);
    active.value = { rowCount: Math.min(gridRows.value, active.value.rowCount), columnCount: Math.min(gridColumns.value, active.value.columnCount) };
    void nextTick(focusCell);
  }
}
/** Switches to custom sizing while preserving the highlighted tuple. */
function openCustom(): void {
  rows.value = active.value.rowCount; columns.value = active.value.columnCount; custom.value = true;
  void nextTick(() => panel.value?.querySelector<HTMLInputElement>("input")?.focus());
}
/** Returns to the keyboard-addressable quick grid. */
function back(): void { custom.value = false; void nextTick(focusCell); }
onMounted(() => { void nextTick(focusCell); });
</script>

<template>
  <section ref="panel" class="qk-table-size-picker" :aria-label="labels.title" @keydown.esc.stop.prevent="emit('cancel')">
    <template v-if="!custom">
      <p class="qk-table-size-picker__size" aria-live="polite">{{ labels.size(active) }}</p>
      <div class="qk-table-size-picker__grid" role="grid" :aria-label="labels.size(active)" :aria-rowcount="gridRows" :aria-colcount="gridColumns" @pointermove="keyboard = false">
        <div v-for="row in gridRows" :key="row" role="row" class="qk-table-size-picker__row" :style="{ gridTemplateColumns: `repeat(${gridColumns}, 20px)` }">
          <button v-for="column in gridColumns" :key="column" type="button" role="gridcell" class="qk-table-size-picker__cell"
            :data-table-row="row" :data-table-column="column" :data-active="row === active.rowCount && column === active.columnCount"
            :data-highlighted="isTableGridCellHighlighted({ rowCount: row, columnCount: column }, active) || undefined"
            :data-focus-visible="keyboard && row === active.rowCount && column === active.columnCount || undefined"
            :aria-label="labels.size({ rowCount: row, columnCount: column })" :aria-selected="row === active.rowCount && column === active.columnCount"
            :tabindex="row === active.rowCount && column === active.columnCount ? 0 : -1" :disabled="disabled || row > maxDimension || column > maxDimension"
            @pointerdown.prevent @pointerenter="keyboard = false; activate(row, column)" @focus="focus($event, row, column)" @keydown="navigate" @click="commit({ rowCount: row, columnCount: column })" />
        </div>
      </div>
      <QuireButton block size="sm" variant="ghost" :disabled="disabled" @click="openCustom">{{ labels.custom }}</QuireButton>
    </template>
    <form v-else class="qk-table-size-picker__form" @submit.prevent="size && commit(size)">
      <p class="qk-table-size-picker__size">{{ size ? labels.size(size) : labels.title }}</p>
      <QuireField v-slot="{ controlProps }" :label="labels.rows" :disabled="disabled" width="100%">
        <QuireInputNumber v-bind="controlProps" :label="labels.rows" :model-value="rows === null ? '' : String(rows)" :min="1" :max="limit" width="100%" size="sm" data-table-custom-rows
          :format-options="{ maximumFractionDigits: 0, useGrouping: false }" @value-change="rows = Number.isFinite($event.valueAsNumber) ? $event.valueAsNumber : null" />
      </QuireField>
      <QuireField v-slot="{ controlProps }" :label="labels.columns" :disabled="disabled" width="100%">
        <QuireInputNumber v-bind="controlProps" :label="labels.columns" :model-value="columns === null ? '' : String(columns)" :min="1" :max="limit" width="100%" size="sm" data-table-custom-columns
          :format-options="{ maximumFractionDigits: 0, useGrouping: false }" @value-change="columns = Number.isFinite($event.valueAsNumber) ? $event.valueAsNumber : null" />
      </QuireField>
      <div class="qk-table-size-picker__actions">
        <QuireButton size="sm" variant="ghost" :disabled="disabled" @click="back">{{ labels.back }}</QuireButton>
        <QuireButton size="sm" type="submit" :disabled="disabled || !size" data-table-custom-submit>{{ labels.submit }}</QuireButton>
      </div>
    </form>
    <p v-if="error" role="alert" class="qk-table-size-picker__error">{{ error }}</p>
  </section>
</template>
