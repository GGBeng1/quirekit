<script setup lang="ts">
import PickerControlAnchor from "../shared/picker/control-anchor.vue";
import { DateInput } from "@ark-ui/vue/date-input";
import SegmentedInputRoot from "../shared/segmented-input/root.vue";
import type { DateInputDateValue } from "@ark-ui/vue/date-input";
import { computed, onMounted, onScopeDispose, ref, useId, watch } from "vue";
import type { QuireKitDateInputProps, QuireKitDateInputValue } from "./types";
import { IsoDateFormatter } from "./formatter";
import { parseCalendarDate } from "./value";
import QuireIconButton from "../button/icon-button.vue";
import QuireIcon from "../icon/icon.vue";
import { useQuireKitMessages } from "../locale-provider/context";
import { segmentLabel } from "../shared/segmented-input/label";
const props = withDefaults(defineProps<QuireKitDateInputProps>(), {
  defaultValue: null, size: "sm", width: "200px", dateFormat: "iso", hideLabel: false,
  disabled: false, readOnly: false, required: false, invalid: false, clearable: false
});
const emit = defineEmits<{
  /** Complete ISO calendar date, or null when the date becomes incomplete or empty. */
  "update:modelValue": [value: QuireKitDateInputValue];
}>();
defineSlots<{
  /** Optional decorative leading icon or short prefix. */
  leading?: () => unknown;
  /** Optional trailing content, such as a future calendar trigger. */
  trailing?: () => unknown;
}>();
const id = useId();
const text = useQuireKitMessages("dateInput");
const pickerText = useQuireKitMessages("picker");
const root = ref<HTMLDivElement>();
const internalValue = ref(props.defaultValue);
const resetVersion = ref(0);
const value = computed(() => props.modelValue === undefined ? internalValue.value : props.modelValue);
const dates = computed(() => { const date = parseCalendarDate(value.value); return date ? [date] : []; });
const minDate = computed(() => parseCalendarDate(props.min));
const maxDate = computed(() => parseCalendarDate(props.max));
const placeholder = computed(() => parseCalendarDate(props.placeholderValue));
const optionalBindings = computed(() => ({
  ...(props.dateFormat === "iso" ? { formatter: new IsoDateFormatter() } : {}),
  ...(placeholder.value ? { placeholderValue: placeholder.value } : {}),
  ...(props.name === undefined ? {} : { name: props.name }),
  ...(props.form === undefined ? {} : { form: props.form })
}));
const outsideBounds = computed(() => {
  const date = dates.value[0];
  return date !== undefined && ((minDate.value !== undefined && date.compare(minDate.value) < 0) || (maxDate.value !== undefined && date.compare(maxDate.value) > 0));
});
const invalidState = computed(() => props.invalid || outsideBounds.value);
const message = computed(() => invalidState.value ? (props.errorText || (outsideBounds.value ? pickerText.value.dateBetween(props.min, props.max) : props.description)) : props.description);
let currentForm: HTMLFormElement | null = null;
/**
 * Adapts Ark's complete-date array to the single-date public model.
 * @param next - Complete values emitted by the upstream date controller.
 */
function update(next: DateInputDateValue[]): void {
  if (props.disabled || props.readOnly) return;
  const date = next[0]?.toString() ?? null;
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
    <SegmentedInputRoot :key="resetVersion" :id="id" :model-value="dates" v-bind="optionalBindings" :disabled="disabled" :read-only="readOnly" :required="required" :invalid="invalidState" granularity="day" @update:model-value="update">
      <DateInput.Label :class="hideLabel ? 'sr-only' : 'qk-date-input__label'">{{ label }}<span v-if="required" aria-hidden="true"> *</span></DateInput.Label>
      <PickerControlAnchor>
        <DateInput.Control :class="['qk-date-input__control', `qk-date-input__control--${size}`]">
          <span v-if="$slots.leading" class="qk-date-input__adornment" aria-hidden="true"><slot name="leading" /></span>
          <DateInput.Context v-slot="date">
            <DateInput.SegmentGroup class="qk-date-input__segments">
              <DateInput.Segment v-for="(segment, segmentIndex) in date.getSegments()" :key="segmentIndex" :segment="segment" :class="['qk-date-input__segment', segment.type === 'literal' && 'qk-date-input__literal']" :aria-label="segmentLabel(label, segment.type, pickerText)" :aria-describedby="message ? `${id}-message` : undefined" />
            </DateInput.SegmentGroup>
            <span v-if="(clearable && !disabled && !readOnly) || $slots.trailing" class="qk-date-input__actions">
              <QuireIconButton v-if="clearable && !disabled && !readOnly" :label="text.clear" size="xs" variant="text" @pointerdown.prevent @click="date.clearValue(); date.focus()"><QuireIcon name="close" :size="12" /></QuireIconButton>
              <slot name="trailing" />
            </span>
          </DateInput.Context>
        </DateInput.Control>
      </PickerControlAnchor>
      <DateInput.HiddenInput :value="value ?? ''" />
    </SegmentedInputRoot>
    <p v-if="message" :id="`${id}-message`" :class="['qk-date-input__message', invalidState && 'qk-date-input__message--invalid']">{{ message }}</p>
  </div>
</template>
