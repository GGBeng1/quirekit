<script setup lang="ts">
import { computed } from "vue";
import { DateInput, type DateInputDateValue } from "@ark-ui/vue/date-input";
import SegmentedInputRoot from "../shared/segmented-input/root.vue";
import { CivilDateTimeFormatter } from "../date-time-picker/formatter";
import { parseCivilDateTime, serializeCivilDateTime } from "../date-time-picker/value";
import type { DateTimeRangeEndpointProps } from "./types";
import { useQuireKitLocale, useQuireKitMessages } from "../locale-provider/context";
import { segmentLabel } from "../shared/segmented-input/label";
const props = defineProps<DateTimeRangeEndpointProps>();
const emit = defineEmits<{ /** Complete or incomplete endpoint, without affecting its sibling. */ "update:modelValue": [value: string | null] }>();
const locale = useQuireKitLocale();
const text = useQuireKitMessages("picker");
const formatter = computed(() => new CivilDateTimeFormatter(locale.value, props.granularity, props.hourCycle));
const dates = computed(() => {
  const date = parseCivilDateTime(props.modelValue);
  if (props.granularity === "minute" && date && date.second !== 0) throw new TypeError("Minute precision cannot hide non-zero seconds; use granularity=second.");
  return date ? [date] : [];
});
const bindings = computed(() => ({ ...(props.name ? { name: props.name } : {}), ...(props.form ? { form: props.form } : {}), placeholderValue: parseCivilDateTime(props.placeholderValue ?? "2000-01-01 00:00:00")! }));
/** @param values - Complete Ark segments, or empty when this endpoint is incomplete. */
function update(values: DateInputDateValue[]): void { if (!props.disabled && !props.readOnly) emit("update:modelValue", serializeCivilDateTime(values[0], props.granularity)); }
</script>
<template>
  <SegmentedInputRoot class="qk-date-time-range-picker__endpoint qk-date-time-range-picker__active-endpoint" :model-value="dates" :formatter="formatter" :granularity="granularity" time-zone="UTC" :disabled="disabled" :read-only="readOnly" :required="required" :invalid="invalid" v-bind="bindings" @update:model-value="update">
    <DateInput.Label class="sr-only">{{ label }}</DateInput.Label>
    <DateInput.Control class="qk-date-time-range-picker__endpoint-control">
      <DateInput.Context v-slot="date"><DateInput.SegmentGroup class="qk-date-input__segments">
        <DateInput.Segment v-for="(segment, index) in date.getSegments()" :key="index" :segment="segment" :class="['qk-date-input__segment', segment.type === 'literal' && 'qk-date-input__literal', segment.type === 'year' && 'qk-date-time-picker__year', segment.type === 'literal' && segment.text === ' ' && 'qk-date-time-picker__space', segment.type === 'dayPeriod' && 'qk-time-input__period', /^[\u2066-\u2069]+$/.test(segment.text) && 'qk-time-input__direction-marker']" :aria-label="segmentLabel(label, segment.type, text)" :aria-describedby="describedBy" />
      </DateInput.SegmentGroup></DateInput.Context>
    </DateInput.Control>
    <DateInput.HiddenInput :value="serializeCivilDateTime(dates[0], granularity) ?? ''" />
  </SegmentedInputRoot>
</template>
