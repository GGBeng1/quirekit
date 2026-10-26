<script setup lang="ts">
import { DateInput, type DateInputDateValue } from '@ark-ui/vue/date-input';
import SegmentedInputRoot from '../shared/segmented-input/root.vue';
import { computed } from 'vue';
import { IsoDateFormatter } from '../date-input/formatter';
import { parseCalendarDate } from '../date-input/value';
import type { DateRangeEndpointProps } from './types';
import { useQuireKitMessages } from '../locale-provider/context';
import { segmentLabel } from '../shared/segmented-input/label';
const props = defineProps<DateRangeEndpointProps>();
const emit = defineEmits<{ /** Complete endpoint, independently of the other date. */ 'update:modelValue': [value: string | null] }>();
const text = useQuireKitMessages('picker');
const dates = computed(() => { const date = parseCalendarDate(props.modelValue); return date ? [date] : []; });
const bindings = computed(() => ({
  ...(props.dateFormat === "iso" ? { formatter: new IsoDateFormatter() } : {}),
  ...(props.name ? { name: props.name } : {}), ...(props.form ? { form: props.form } : {}),
  ...(props.placeholderValue ? { placeholderValue: parseCalendarDate(props.placeholderValue)! } : {})
}));
/** @param next - Complete endpoint or an incomplete marker, independently of its sibling. */
function update(next: DateInputDateValue[]): void { if (!props.disabled && !props.readOnly) emit('update:modelValue', next[0]?.toString() ?? null); }
</script>
<template>
  <SegmentedInputRoot class="qk-date-range-picker__endpoint" :model-value="dates" v-bind="bindings" :disabled="disabled" :read-only="readOnly" :required="required" :invalid="invalid" granularity="day" @update:model-value="update">
    <DateInput.Label class="sr-only">{{ label }}</DateInput.Label>
    <DateInput.Control class="qk-date-range-picker__endpoint-control">
      <DateInput.Context v-slot="date"><DateInput.SegmentGroup class="qk-date-input__segments">
        <DateInput.Segment v-for="(segment, index) in date.getSegments()" :key="index" :segment="segment" :class="['qk-date-input__segment', segment.type === 'literal' && 'qk-date-input__literal']" :aria-label="segmentLabel(label, segment.type, text)" :aria-describedby="describedBy" />
      </DateInput.SegmentGroup></DateInput.Context>
    </DateInput.Control>
    <DateInput.HiddenInput :value="modelValue ?? ''" />
  </SegmentedInputRoot>
</template>
