<script setup lang="ts">
import { computed } from "vue";
import { DateInput, type DateInputDateValue } from "@ark-ui/vue/date-input";
import SegmentedInputRoot from "../shared/segmented-input/root.vue";
import { StableTimeFormatter } from "../time-input/formatter";
import { parseClockTime, serializeClockTime } from "../time-input/value";
import type { TimeRangeEndpointProps } from "./types";
import { useQuireKitLocale, useQuireKitMessages } from "../locale-provider/context";
import { segmentLabel } from "../shared/segmented-input/label";
const props = defineProps<TimeRangeEndpointProps>();
const emit = defineEmits<{ /** Complete or incomplete endpoint, without affecting its sibling. */ "update:modelValue": [value: string | null] }>();
const locale = useQuireKitLocale();
const text = useQuireKitMessages("picker");
const formatter = computed(() => new StableTimeFormatter(locale.value, { hour: "2-digit", minute: "2-digit", ...(props.granularity === "second" ? { second: "2-digit" } : {}), hourCycle: props.hourCycle === 12 ? "h12" : "h23", timeZone: "UTC" }));
const dates = computed(() => {
  const date = parseClockTime(props.modelValue);
  if (props.granularity === "minute" && date && date.second !== 0) throw new TypeError("Minute precision cannot hide non-zero seconds; use granularity=second.");
  return date ? [date] : [];
});
const bindings = computed(() => ({ ...(props.name ? { name: props.name } : {}), ...(props.form ? { form: props.form } : {}), placeholderValue: parseClockTime(props.placeholderValue ?? "00:00")! }));
/** @param values - Complete Ark segments, or empty when this endpoint is incomplete. */
function update(values: DateInputDateValue[]): void { if (!props.disabled && !props.readOnly) emit("update:modelValue", serializeClockTime(values[0], props.granularity)); }
</script>
<template>
  <SegmentedInputRoot class="qk-time-range-picker__endpoint" :model-value="dates" :formatter="formatter" :granularity="granularity" time-zone="UTC" :disabled="disabled" :read-only="readOnly" :required="required" :invalid="invalid" v-bind="bindings" @update:model-value="update">
    <DateInput.Label class="sr-only">{{ label }}</DateInput.Label>
    <DateInput.Control class="qk-time-range-picker__endpoint-control">
      <DateInput.Context v-slot="date"><DateInput.SegmentGroup class="qk-time-input__segments">
        <DateInput.Segment v-for="(segment, index) in date.getSegments()" :key="index" :segment="segment" :class="['qk-time-input__segment', segment.type === 'literal' && 'qk-time-input__literal', segment.type === 'dayPeriod' && 'qk-time-input__period', /^[\u2066-\u2069]+$/.test(segment.text) && 'qk-time-input__direction-marker']" :aria-label="segmentLabel(label, segment.type, text)" :aria-describedby="describedBy" />
      </DateInput.SegmentGroup></DateInput.Context>
    </DateInput.Control>
    <DateInput.HiddenInput :value="serializeClockTime(dates[0], granularity) ?? ''" />
  </SegmentedInputRoot>
</template>
