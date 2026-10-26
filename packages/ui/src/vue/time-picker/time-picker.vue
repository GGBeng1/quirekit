<script setup lang="ts" generic="Range extends boolean = false">
import { computed } from 'vue';
import type { QuireKitTimePickerProps, QuireKitTimeSinglePickerProps, TimePickerFooterProps } from './types';
import type { QuireKitPickerValue, QuireKitPickerRange } from '../date-picker/types';
import type { QuireKitTimeRangePickerProps } from '../time-range-picker/types';
import Single from './single.vue';
import TimeRange from '../time-range-picker/time-range-picker.vue';
const props = withDefaults(defineProps<QuireKitTimePickerProps<Range>>(), { open: undefined, openOnFocus: true, clearable: true });
const emit = defineEmits<{ /** Public model inferred from range. */ 'update:modelValue': [value: QuireKitPickerValue<Range>]; /** Requested visibility. */ 'update:open': [open: boolean] }>();
defineSlots<{
  /** Decorative prefix in the field. */ leading?: () => unknown;
  /** Shortcuts update the current draft. */ footer?: (props: TimePickerFooterProps<Range>) => unknown;
}>();
const bindings = computed(() => {
  const { range, ...rest } = props;
  return Object.fromEntries(Object.entries(rest).filter(([key, value]) => value !== undefined && (range || !['startLabel', 'endLabel', 'allowOvernight', 'isRangeUnavailable'].includes(key))));
});
const single = computed(() => ({ ...bindings.value, ...(props.isTimeUnavailable ? { isTimeUnavailable: (value: string) => props.isTimeUnavailable!(value, 'start') } : {}) }) as unknown as QuireKitTimeSinglePickerProps);
const rangeProps = computed(() => bindings.value as unknown as QuireKitTimeRangePickerProps);
/** @param value - Value from the explicitly chosen scalar/range owner. */
function update(value: string | null | QuireKitPickerRange): void { emit('update:modelValue', value as QuireKitPickerValue<Range>); }
</script>
<template>
  <TimeRange v-if="range" v-bind="rangeProps" @update:model-value="update" @update:open="emit('update:open', $event)">
    <template v-if="$slots.leading" #leading><slot name="leading" /></template><template v-if="$slots.footer" #footer="scope"><slot name="footer" v-bind="scope as TimePickerFooterProps<Range>" /></template>
  </TimeRange>
  <Single v-else v-bind="single" @update:model-value="update" @update:open="emit('update:open', $event)">
    <template v-if="$slots.leading" #leading><slot name="leading" /></template><template v-if="$slots.footer" #footer="scope"><slot name="footer" v-bind="scope as TimePickerFooterProps<Range>" /></template>
  </Single>
</template>
