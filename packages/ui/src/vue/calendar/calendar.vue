<script setup lang="ts">
import { DatePicker, type DateValue } from '@ark-ui/vue/date-picker';
import { useQuireKitLocale, useQuireKitMessages } from '../locale-provider/context';
import { computed, ref, watch } from 'vue';
import { parseCalendarDate } from '../date-input/value';
import { parseCalendarSelection, serializeCalendarSelection, findUnavailableRangeDate } from './value';
import type { CalendarDayAnnouncement, QuireKitCalendarProps, QuireKitCalendarValue } from './types';
import { announceCalendarDay } from './announcements';
import CalendarDayView from './day-view.vue';
import CalendarPeriodView from './period-view.vue';
const props = withDefaults(defineProps<QuireKitCalendarProps>(), { defaultValue: null, selectionMode: 'single', density: 'comfortable', disabled: false, readOnly: false, fixedWeeks: true, numberOfMonths: 1, allowNonContiguousRange: false });
const emit = defineEmits<{
  /** Current selection; range mode may contain only its start while choosing the end. */ 'update:modelValue': [value: QuireKitCalendarValue];
}>();
defineSlots<{ /** Optional supporting text or host-owned actions below the calendar. */ footer?: () => unknown }>();
const locale = useQuireKitLocale();
const text = useQuireKitMessages('calendar');
const pickerText = useQuireKitMessages('picker');
const internal = ref<QuireKitCalendarValue>(props.defaultValue);
const value = computed(() => props.modelValue === undefined ? internal.value : props.modelValue);
const blockedDate = ref<string>();
watch([() => props.modelValue, () => props.isDateUnavailable, () => props.allowNonContiguousRange], () => { blockedDate.value = undefined; });
const dates = computed(() => parseCalendarSelection(value.value, props.selectionMode));
const invalidRangeDate = computed(() => props.selectionMode === 'range' && !props.allowNonContiguousRange ? findUnavailableRangeDate(dates.value, props.isDateUnavailable) : undefined);
const rangeError = computed(() => {
  const date = blockedDate.value ?? invalidRangeDate.value;
  return date ? pickerText.value.rangeIncludesUnavailable(date) : '';
});
const optionalBindings = computed(() => ({
  ...(props.min ? { min: parseCalendarDate(props.min)! } : {}),
  ...(props.max ? { max: parseCalendarDate(props.max)! } : {}),
  ...(props.defaultFocusedValue ? { defaultFocusedValue: parseCalendarDate(props.defaultFocusedValue)! } : {}),
  ...(props.timeZone ? { timeZone: props.timeZone } : {}),
  ...(props.startOfWeek !== undefined ? { startOfWeek: props.startOfWeek } : {}),
  ...(props.maxSelectedDates !== undefined ? { maxSelectedDates: props.maxSelectedDates } : {})
}));
const translations = computed(() => ({
  dayCell: (state: CalendarDayAnnouncement) => announceCalendarDay(state, text.value),
  prevTrigger: text.value.previous,
  nextTrigger: text.value.next,
  viewTrigger: text.value.switchView
}));
/**
 * Preserves Ark's selection behavior and adapts only the public value shape.
 * @param next - Selected calendar dates.
 */
function update(next: DateValue[]): void {
  if (props.disabled || props.readOnly) return;
  blockedDate.value = props.selectionMode === 'range' && !props.allowNonContiguousRange ? findUnavailableRangeDate(next, props.isDateUnavailable) : undefined;
  if (blockedDate.value) return;
  const selection = serializeCalendarSelection(next, props.selectionMode);
  if (props.modelValue === undefined) internal.value = selection;
  emit('update:modelValue', selection);
}
/**
 * Rejects a blocked endpoint before Ark advances its range-selection phase.
 * Keeping the start phase intact lets the user immediately choose a valid end.
 * @param event - Date-cell pointer activation or keyboard confirmation.
 */
function guardRangeChoice(event: MouseEvent | KeyboardEvent): void {
  if (props.selectionMode !== 'range' || props.allowNonContiguousRange || dates.value.length !== 1 || props.disabled || props.readOnly) return;
  if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return;
  const cell = event.target instanceof Element ? event.target.closest('[data-part="table-cell-trigger"][data-view="day"]') : null;
  const iso = cell?.getAttribute('data-value');
  if (!iso || cell?.getAttribute('aria-disabled') === 'true') return;
  const candidate = parseCalendarDate(iso)!;
  const pair = [dates.value[0]!, candidate].sort((a, b) => a.compare(b));
  const blocked = findUnavailableRangeDate(pair, props.isDateUnavailable);
  if (!blocked) return;
  event.preventDefault(); event.stopPropagation(); blockedDate.value = blocked;
}
/**
 * Applies host availability rules to timezone-independent ISO dates.
 * @param date - Date under evaluation by Ark.
 * @returns Whether the host forbids choosing this date.
 */
function unavailable(date: DateValue): boolean { return props.isDateUnavailable?.(date.toString()) ?? false; }
</script>
<template>
  <DatePicker.Root :class="['qk-calendar', `qk-calendar--${density}`]" :style="{ '--qk-calendar-month-count': numberOfMonths }" role="group" inline :aria-label="label" :model-value="dates" :selection-mode="selectionMode" :locale="locale" :translations="translations" :disabled="disabled" :read-only="readOnly" :invalid="Boolean(rangeError)" :fixed-weeks="fixedWeeks" :num-of-months="numberOfMonths" :is-date-unavailable="unavailable" v-bind="optionalBindings" @update:model-value="update" @click.capture="guardRangeChoice" @keydown.capture="guardRangeChoice">
    <DatePicker.Label class="sr-only">{{ label }}</DatePicker.Label>
    <CalendarDayView :static-heading="readOnly || disabled" :number-of-months="numberOfMonths" />
    <CalendarPeriodView :static-heading="readOnly || disabled" view="month" />
    <CalendarPeriodView :static-heading="readOnly || disabled" view="year" />
    <p v-if="rangeError" class="qk-calendar__error" role="status">{{ rangeError }}</p>
    <div v-if="$slots.footer" class="qk-calendar__footer"><slot name="footer" /></div>
  </DatePicker.Root>
</template>
