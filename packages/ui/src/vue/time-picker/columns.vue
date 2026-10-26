<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import type { TimeColumn, TimeColumnsProps, TimeDraft } from "./types";
import { availableTimes } from "./value";
import { dayPeriodLabels, timeOptions } from "./options";
import { useQuireKitLocale, useQuireKitMessages } from "../locale-provider/context";
import QuireListbox from "../listbox/listbox.vue";
const props = defineProps<TimeColumnsProps>();
const emit = defineEmits<{ /** Updated unit selection, without confirming the owning time or range. */ "update:modelValue": [value: TimeDraft] }>();
const root = ref<HTMLElement>();
const precision = computed(() => props.rules.granularity ?? "minute");
const locale = useQuireKitLocale();
const text = useQuireKitMessages("picker");
const periods = computed(() => dayPeriodLabels(locale.value));
const allowed = computed(() => availableTimes(props.rules));
const columns = computed(() => {
  const keys: TimeColumn[] = [...(props.hourCycle === 12 ? ["period" as const] : []), "hour", "minute", ...(precision.value === "second" ? ["second" as const] : [])];
  return keys.map(key => ({ key, label: text.value.columns[key], items: timeOptions(key, props.modelValue, props.hourCycle, allowed.value, periods.value, props.rules) }));
});
/** @param column - Edited unit. @param values - Ark single selection. */
function choose(column: TimeColumn, values: string[] | undefined): void { if (values?.[0] !== undefined) emit("update:modelValue", { ...props.modelValue, [column]: Number(values[0]) }); }
/** Keeps selected rows visible by scrolling each list only; the page and popup anchor stay still. */
async function revealSelections(): Promise<void> {
  await nextTick();
  root.value?.querySelectorAll<HTMLElement>('[role="listbox"]').forEach(list => {
    const selected = list.querySelector<HTMLElement>('[aria-selected="true"]');
    if (selected) {
      // Whole-row positioning avoids cutting digits in half on the initial reveal.
      const rowHeight = selected.getBoundingClientRect().height;
      const precedingRows = Math.max(0, Math.floor((list.clientHeight / rowHeight - 1) / 2));
      list.scrollTop += selected.getBoundingClientRect().top - list.getBoundingClientRect().top - precedingRows * rowHeight;
    }
  });
}
onMounted(revealSelections);
/** Moves keyboard editing into the first time column without scrolling ancestors. */
function focusFirst(): void { root.value?.querySelector<HTMLElement>('[role="listbox"]')?.focus({ preventScroll: true }); }
defineExpose({ revealSelections, focusFirst });
</script>
<template>
  <div ref="root" class="qk-time-picker__columns" :style="{ '--qk-time-picker-columns': columns.length }">
    <div v-for="column in columns" :key="column.key" class="qk-time-picker__column">
      <p class="qk-time-picker__heading" aria-hidden="true">{{ column.label }}</p>
      <QuireListbox hide-label :label="text.part(label, column.label)" :items="column.items" :model-value="modelValue[column.key] === null ? [] : [String(modelValue[column.key])]" :typeahead="true" :select-on-highlight="false" item-class="qk-time-picker__option" content-class="qk-time-picker__list" @update:model-value="choose(column.key, $event)">
        <template #item="{ item }"><span class="qk-time-picker__unit">{{ item.label }}</span></template>
      </QuireListbox>
    </div>
  </div>
</template>
