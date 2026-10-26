<script setup lang="ts" generic="Range extends boolean = false">
import { computed } from 'vue';
import type { QuireKitDatePickerProps, QuireKitDateSinglePickerProps, QuireKitPickerValue, QuireKitPickerRange } from './types';
import type { QuireKitDateRangePickerProps } from '../date-range-picker/types';
import type { QuireKitDateTimePickerProps } from '../date-time-picker/types';
import type { QuireKitDateTimeRangePickerProps } from '../date-time-range-picker/types';
import Single from './single.vue';
import DateRange from '../date-range-picker/date-range-picker.vue';
import DateTime from '../date-time-picker/date-time-picker.vue';
import DateTimeRange from '../date-time-range-picker/date-time-range-picker.vue';
const props = withDefaults(defineProps<QuireKitDatePickerProps<Range>>(), { open: undefined, openOnFocus: true, clearable: true });
const emit = defineEmits<{ /** One complete or partially empty public model. */ 'update:modelValue': [value: QuireKitPickerValue<Range>]; /** Requested visibility. */ 'update:open': [open: boolean] }>();
defineSlots<{
  /** Decorative prefix in the field. */ leading?: () => unknown;
  /** Optional shortcuts; use the setter matching range/showTime. */ footer?: (props: { setDateTime?: (value: string) => void; setRange?: (value: QuireKitPickerRange) => void; selectRange?: (value: QuireKitPickerRange) => void }) => unknown;
}>();
// Drop undefined values so the selected value owner applies its own field defaults.
const bindings = computed(() => {
  const { range, showTime, ...rest } = props;
  const excluded = showTime ? ['dateFormat', 'timeZone', 'numberOfMonths', 'allowNonContiguousRange'] : ['granularity', 'hourCycle', 'hourStep', 'minuteStep', 'secondStep', 'isDateTimeUnavailable', 'isRangeUnavailable'];
  if (!range || !showTime) excluded.push('rangeLayout');
  if (!range) excluded.push('startLabel', 'endLabel', 'numberOfMonths', 'allowNonContiguousRange');
  return Object.fromEntries(Object.entries(rest).filter(([key, value]) => value !== undefined && !excluded.includes(key)));
});
const single = computed(() => bindings.value as unknown as QuireKitDateSinglePickerProps);
const dateRange = computed(() => bindings.value as unknown as QuireKitDateRangePickerProps);
const dateTime = computed(() => ({ ...bindings.value, granularity: props.granularity ?? 'minute', ...(props.isDateTimeUnavailable ? { isDateTimeUnavailable: (value: string) => props.isDateTimeUnavailable!(value, 'start') } : {}) }) as unknown as QuireKitDateTimePickerProps);
const dateTimeRange = computed(() => ({ ...bindings.value, granularity: props.granularity ?? 'minute' }) as unknown as QuireKitDateTimeRangePickerProps);
/** @param value - Model from the explicit mode; never infer mode from value shape. */
function update(value: string | null | QuireKitPickerRange): void { emit('update:modelValue', value as QuireKitPickerValue<Range>); }
</script>
<template>
  <DateTimeRange v-if="range && showTime" v-bind="dateTimeRange" @update:model-value="update" @update:open="emit('update:open', $event)">
    <template v-if="$slots.leading" #leading><slot name="leading" /></template><template v-if="$slots.footer" #footer="scope"><slot name="footer" v-bind="scope" /></template>
  </DateTimeRange>
  <DateTime v-else-if="showTime" v-bind="dateTime" @update:model-value="update" @update:open="emit('update:open', $event)">
    <template v-if="$slots.leading" #leading><slot name="leading" /></template><template v-if="$slots.footer" #footer="scope"><slot name="footer" v-bind="scope" /></template>
  </DateTime>
  <DateRange v-else-if="range" v-bind="dateRange" @update:model-value="update" @update:open="emit('update:open', $event)">
    <template v-if="$slots.leading" #leading><slot name="leading" /></template><template v-if="$slots.footer" #footer="scope"><slot name="footer" v-bind="scope" /></template>
  </DateRange>
  <Single v-else v-bind="single" @update:model-value="update" @update:open="emit('update:open', $event)">
    <template v-if="$slots.leading" #leading><slot name="leading" /></template><template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </Single>
</template>
