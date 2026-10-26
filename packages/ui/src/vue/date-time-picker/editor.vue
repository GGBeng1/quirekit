<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import type { DateTimeDraft, DateTimeEditorProps } from './types';
import type { QuireKitCalendarValue } from '../calendar/types';
import type { TimeDraft } from '../time-picker/types';
import { dateTimeTimeRules } from './rules';
import { draftTime } from '../time-picker/value';
import QuireCalendar from '../calendar/calendar.vue';
import QuireTabs from '../tabs/tabs.vue';
import TimeColumns from '../time-picker/columns.vue';
import { usePickerBottom } from '../shared/picker/context';
import { useQuireKitMessages } from '../locale-provider/context';
const bottom = usePickerBottom();
const props = defineProps<DateTimeEditorProps>();
const emit = defineEmits<{ /** Partial draft changes, never a committed value. */ 'update:modelValue': [value: DateTimeDraft]; /** Explicit date choice, distinct from time edits. */ selectDate: [value: DateTimeDraft] }>();
const active = ref('date'), columns = ref<InstanceType<typeof TimeColumns>>(), calendarRoot = ref<HTMLElement>();
const text = useQuireKitMessages('dateTimePicker');
const items = computed(() => [{ value: 'date', label: text.value.dateTab }, { value: 'time', label: text.value.timeTab }]);
const timeRules = computed(() => dateTimeTimeRules(props.modelValue.date, props.rules));
const calendarProps = computed(() => ({
  ...(props.rules.min ? { min: props.rules.min.slice(0, 10) } : {}),
  ...(props.rules.max ? { max: props.rules.max.slice(0, 10) } : {}),
  ...(props.rules.isDateUnavailable ? { isDateUnavailable: props.rules.isDateUnavailable } : {}),
  ...(props.startOfWeek === undefined ? {} : { startOfWeek: props.startOfWeek }),
  ...(props.modelValue.date || props.placeholderValue ? { defaultFocusedValue: props.modelValue.date ?? props.placeholderValue!.slice(0, 10) } : {})
}));
/** @param date - Explicit calendar selection; all current time units stay intact. */
async function setDate(date: QuireKitCalendarValue): Promise<void> {
  const keyboard = Boolean(calendarRoot.value?.querySelector(':focus-visible'));
  const next = { ...props.modelValue, date: typeof date === 'string' ? date : null };
  emit('update:modelValue', next);
  emit('selectDate', next);
  if (bottom.value && next.date && !draftTime(next.time, props.hourCycle, props.rules.granularity ?? 'second')) {
    active.value = 'time';
    await nextTick();
    if (keyboard) columns.value?.focusFirst();
  }
}
/** @param time - Explicit time-unit selection; the date stays intact. */
function setTime(time: TimeDraft): void { emit('update:modelValue', { ...props.modelValue, time }); }
/** Keeps current selections reachable after a shortcut without scrolling the page. */
async function revealSelections(): Promise<void> { await columns.value?.revealSelections(); }
/** Restores keyboard navigation when sequential editing replaces the calendar. */
function focusDate(): void { calendarRoot.value?.querySelector<HTMLElement>('[data-part="table-cell-trigger"][tabindex="0"]')?.focus({ preventScroll: true }); }
defineExpose({ revealSelections, focusDate });
</script>
<template>
  <QuireTabs v-if="bottom" v-model="active" class="qk-date-time-picker__tabs" :label="text.editor(label)" :items="items" :lazy-mount="true" :unmount-on-exit="true">
    <template #content="{ item, selected }">
      <div v-if="selected && item.value === 'date'" ref="calendarRoot" class="qk-date-time-picker__calendar">
        <QuireCalendar :model-value="modelValue.date" :label="text.calendar(label)" :density="density" v-bind="calendarProps" @update:model-value="setDate" />
      </div>
      <TimeColumns v-else-if="selected" ref="columns" class="min-h-0 mx-auto" :model-value="modelValue.time" :rules="timeRules" :hour-cycle="hourCycle" :label="label" @update:model-value="setTime" />
    </template>
  </QuireTabs>
  <div v-else class="qk-date-time-picker__desktop">
    <div ref="calendarRoot" class="qk-date-time-picker__calendar"><QuireCalendar :model-value="modelValue.date" :label="text.calendar(label)" :density="density" v-bind="calendarProps" @update:model-value="setDate" /></div>
    <TimeColumns ref="columns" class="qk-time-picker__columns--calendar" :model-value="modelValue.time" :rules="timeRules" :hour-cycle="hourCycle" :label="label" @update:model-value="setTime" />
  </div>
</template>
