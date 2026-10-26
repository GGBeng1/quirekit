<script setup lang="ts">
import PickerControlAnchor from "../shared/picker/control-anchor.vue";
import { CivilDateTimeFormatter } from "./formatter";
import { dateTimeError } from "./rules";
import { DateInput } from "@ark-ui/vue/date-input";
import SegmentedInputRoot from "../shared/segmented-input/root.vue";
import type { DateInputDateValue } from "@ark-ui/vue/date-input";
import { computed, onMounted, onScopeDispose, ref, useId, watch } from "vue";
import type { QuireKitDateTimePickerProps, QuireKitDateTimeValue } from "./types";
import { parseCivilDateTime, serializeCivilDateTime } from "./value";
import QuireIconButton from "../button/icon-button.vue";
import QuireIcon from "../icon/icon.vue";
import { useQuireKitLocale, useQuireKitMessages } from "../locale-provider/context";
import { segmentLabel } from "../shared/segmented-input/label";
const props = withDefaults(defineProps<QuireKitDateTimePickerProps>(), {
  defaultValue: null, size: "sm", width: "360px", hideLabel: false,
  disabled: false, readOnly: false, required: false, invalid: false, clearable: false, granularity: "second", hourCycle: 24
});
const emit = defineEmits<{
  /** Complete civil date-time, or null while any required segment is empty. */
  "update:modelValue": [value: QuireKitDateTimeValue];
}>();
defineSlots<{
  /** Optional decorative leading icon or short prefix. */
  leading?: () => unknown;
  /** Resident date/time panel trigger. */
  trailing?: () => unknown;
}>();
const id = useId();
const locale = useQuireKitLocale();
const text = useQuireKitMessages("dateTimePicker");
const pickerText = useQuireKitMessages("picker");
const root = ref<HTMLDivElement>();
const internalValue = ref(props.defaultValue);
const resetVersion = ref(0);
const value = computed(() => props.modelValue === undefined ? internalValue.value : props.modelValue);
const formatter = computed(() => new CivilDateTimeFormatter(locale.value, props.granularity, props.hourCycle));
const dates = computed(() => {
  const date = parseCivilDateTime(value.value);
  if (props.granularity === "minute" && date && date.second !== 0) throw new TypeError("Minute precision cannot hide non-zero seconds; use granularity=second.");
  return date ? [date] : [];
});
const placeholder = computed(() => parseCivilDateTime(props.placeholderValue ?? "2000-01-01 00:00:00"));
const optionalBindings = computed(() => ({
  ...(placeholder.value ? { placeholderValue: placeholder.value } : {}),
  ...(props.name === undefined ? {} : { name: props.name }),
  ...(props.form === undefined ? {} : { form: props.form })
}));
const error = computed(() => dateTimeError(value.value, props, pickerText.value));
const invalidState = computed(() => props.invalid || Boolean(error.value));
const message = computed(() => invalidState.value ? (props.errorText || error.value || props.description) : props.description);
let currentForm: HTMLFormElement | null = null;
/**
 * Adapts Ark's complete-date array without converting civil fields into an instant.
 * @param next - Complete values emitted by the upstream date controller.
 */
function update(next: DateInputDateValue[]): void {
  if (props.disabled || props.readOnly) return;
  const date = serializeCivilDateTime(next[0], props.granularity);
  if (props.modelValue === undefined) internalValue.value = date;
  emit("update:modelValue", date);
}
/**
 * Restores the explicit default after the browser accepts a form reset.
 * @param event - Cancellable reset event from the associated native form.
 */
function reset(event: Event): void {
  queueMicrotask(() => {
    if (event.defaultPrevented) return;
    internalValue.value = props.defaultValue;
    emit("update:modelValue", props.defaultValue);
    // Remount also clears incomplete drafts when the public value was already null.
    resetVersion.value += 1;
  });
}
/** Associates native reset with the same form as Ark's serialized hidden input. */
function bindForm(): void {
  currentForm?.removeEventListener("reset", reset);
  currentForm = root.value?.querySelector("input")?.form ?? null;
  currentForm?.addEventListener("reset", reset);
}
onMounted(bindForm);
watch(() => props.form, bindForm, { flush: "post" });
onScopeDispose(() => currentForm?.removeEventListener("reset", reset));
</script>
<template>
  <div ref="root" class="qk-date-input" :style="{ width }">
    <SegmentedInputRoot :key="resetVersion" :id="id" :model-value="dates" v-bind="optionalBindings" :disabled="disabled" :read-only="readOnly" :required="required" :invalid="invalidState" :granularity="granularity" :formatter="formatter" time-zone="UTC" @update:model-value="update">
      <DateInput.Label :class="hideLabel ? 'sr-only' : 'qk-date-input__label'">{{ label }}<span v-if="required" aria-hidden="true"> *</span></DateInput.Label>
      <PickerControlAnchor>
        <DateInput.Control :class="['qk-date-input__control', `qk-date-input__control--${size}`]">
          <span v-if="$slots.leading" class="qk-date-input__adornment" aria-hidden="true"><slot name="leading" /></span>
          <DateInput.Context v-slot="date">
            <DateInput.SegmentGroup class="qk-date-input__segments">
              <DateInput.Segment v-for="(segment, segmentIndex) in date.getSegments()" :key="segmentIndex" :segment="segment" :class="['qk-date-input__segment', segment.type === 'literal' && 'qk-date-input__literal', segment.type === 'literal' && segment.text === ' ' && 'qk-date-time-picker__space', segment.type === 'year' && 'qk-date-time-picker__year', segment.type === 'dayPeriod' && 'qk-time-input__period', /^[\u2066-\u2069]+$/.test(segment.text) && 'qk-time-input__direction-marker']" :aria-label="segmentLabel(label, segment.type, pickerText)" :aria-describedby="message ? `${id}-message` : undefined" />
            </DateInput.SegmentGroup>
            <span v-if="(clearable && !disabled && !readOnly) || $slots.trailing" class="qk-date-input__actions">
              <QuireIconButton v-if="clearable && !disabled && !readOnly" :label="text.clear" size="xs" variant="text" @pointerdown.prevent @click="date.clearValue(); date.focus()"><QuireIcon name="close" :size="12" /></QuireIconButton>
              <slot name="trailing" />
            </span>
          </DateInput.Context>
        </DateInput.Control>
      </PickerControlAnchor>
      <DateInput.HiddenInput :value="serializeCivilDateTime(dates[0], granularity) ?? ''" />
    </SegmentedInputRoot>
    <p v-if="message" :id="`${id}-message`" :class="['qk-date-input__message', invalidState && 'qk-date-input__message--invalid']">{{ message }}</p>
  </div>
</template>
