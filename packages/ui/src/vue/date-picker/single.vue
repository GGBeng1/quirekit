<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from "vue";
import type { QuireKitDateInputProps } from "../date-input/types";
import type { QuireKitDateSinglePickerProps } from "./types";
import type { QuireKitCalendarValue } from "../calendar/types";
import QuireDateInput from "../date-input/date-input.vue";
import QuireCalendar from "../calendar/calendar.vue";
import QuireIconButton from "../button/icon-button.vue";
import QuireIcon from "../icon/icon.vue";
import { useQuireKitMessages } from "../locale-provider/context";
import { PickerRoot as QuirePopoverRoot, PickerAnchor as QuirePopoverAnchor, PickerTrigger as QuirePopoverTrigger, PickerContent as QuirePopoverContent } from "../shared/picker";

const props = withDefaults(defineProps<QuireKitDateSinglePickerProps>(), {
  dateFormat: "iso", defaultValue: null, size: "sm", width: "240px", open: undefined, defaultOpen: false, presentation: "auto", openOnFocus: true,
  disabled: false, readOnly: false, clearable: true, calendarDensity: "comfortable"
});
const emit = defineEmits<{
  /** One shared ISO date or empty value, regardless of the editing surface. */
  "update:modelValue": [value: string | null];
  /** Requested popup visibility. */
  "update:open": [open: boolean];
}>();
defineSlots<{
  /** Decorative prefix inside the field. */ leading?: () => unknown;
  /** Host actions or supporting text below the calendar. */ footer?: () => unknown;
}>();
const text = useQuireKitMessages("datePicker");
const pickerText = useQuireKitMessages("picker");
const internal = ref(props.defaultValue);
const internalOpen = ref(props.defaultOpen);
const panel = ref<HTMLElement>();
const trigger = ref<HTMLElement>();
const value = computed(() => props.modelValue === undefined ? internal.value : props.modelValue);
const opened = computed(() => !props.disabled && !props.readOnly && (props.open ?? internalOpen.value));
const unavailable = computed(() => Boolean(value.value && props.isDateUnavailable?.(value.value)));
const triggerLabel = computed(() => text.value.openCalendar(props.label));
const inputProps = computed(() => {
  const { open, defaultOpen, calendarDensity, timeZone, startOfWeek, isDateUnavailable, presentation, openOnFocus, ...input } = props;
  return { ...Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)), label: input.label } as QuireKitDateInputProps;
});
const calendarProps = computed(() => ({
  ...(props.min ? { min: props.min } : {}), ...(props.max ? { max: props.max } : {}),
  ...(props.timeZone ? { timeZone: props.timeZone } : {}),
  ...(props.startOfWeek !== undefined ? { startOfWeek: props.startOfWeek } : {}),
  ...(props.isDateUnavailable ? { isDateUnavailable: props.isDateUnavailable } : {}),
  ...(value.value || props.placeholderValue ? { defaultFocusedValue: value.value ?? props.placeholderValue! } : {})
}));
/**
 * Keeps field and calendar projections under a single committed value owner.
 * @param next - ISO date emitted by the field, including native reset.
 */
function update(next: string | null): void {
  if (props.modelValue === undefined) internal.value = next;
  emit("update:modelValue", next);
}
/**
 * Publishes popup requests without bypassing controlled visibility.
 * @param next - Requested visibility.
 */
function setOpen(next: boolean): void {
  if (next && (props.disabled || props.readOnly)) return;
  internalOpen.value = next;
  emit("update:open", next);
}
/**
 * Commits a calendar choice and closes only after a complete single date.
 * @param next - Shared calendar selection shape.
 */
function choose(next: QuireKitCalendarValue): void {
  if (props.disabled || props.readOnly || typeof next !== "string") return;
  update(next);
  setOpen(false);
}
/** @returns The calendar's current roving date target after mounting the popup. */
function initialFocus(): HTMLElement | null { return panel.value?.querySelector('[data-view="day"][data-part="table-cell-trigger"][tabindex="0"]') ?? null; }
/** @returns The resident opening button, including after choosing with a keyboard. */
function finalFocus(): HTMLElement | null { return trigger.value?.querySelector("button") ?? null; }
watch([() => props.disabled, () => props.readOnly], ([disabled, readOnly]) => { if (disabled || readOnly) setOpen(false); });

let associatedForm: HTMLFormElement | null = null;
/** @param event - Native reset; discard the calendar only when reset is accepted. */
function resetPanel(event: Event): void { queueMicrotask(() => { if (!event.defaultPrevented) setOpen(false); }); }
/** Associates dismissal with the same native or externally linked form as the field. */
function bindForm(): void {
  associatedForm?.removeEventListener('reset', resetPanel);
  const form = props.form ? trigger.value?.ownerDocument.getElementById(props.form) : trigger.value?.closest('form');
  associatedForm = form?.tagName === 'FORM' ? form as HTMLFormElement : null;
  associatedForm?.addEventListener('reset', resetPanel);
}
onMounted(bindForm);
watch(() => props.form, bindForm, { flush: 'post' });
onScopeDispose(() => associatedForm?.removeEventListener('reset', resetPanel));
</script>
<template>
  <QuirePopoverRoot :label="label" :disabled="disabled || readOnly" :presentation="presentation" :open-on-focus="openOnFocus" :open="opened" :initial-focus-el="initialFocus" :final-focus-el="finalFocus" @update:open="setOpen">
    <QuirePopoverAnchor>
      <QuireDateInput v-bind="inputProps" :model-value="value" :invalid="invalid || unavailable" :error-text="errorText || (unavailable ? pickerText.dateUnavailable : '')" @update:model-value="update" @keydown.alt.down.prevent="setOpen(true)">
        <template v-if="$slots.leading" #leading><slot name="leading" /></template>
        <template #trailing>
          <span ref="trigger" class="qk-date-picker__trigger">
            <QuirePopoverTrigger as-child><QuireIconButton :label="triggerLabel" size="xs" variant="text" :disabled="disabled || readOnly"><QuireIcon name="calendar" :size="16" /></QuireIconButton></QuirePopoverTrigger>
          </span>
        </template>
      </QuireDateInput>
    </QuirePopoverAnchor>
    <QuirePopoverContent :show-arrow="false" :aria-label="label" :class="['qk-date-picker__panel', `qk-date-picker__panel--${calendarDensity}`]">
      <div v-if="opened" ref="panel">
        <QuireCalendar :label="label" :model-value="value" :density="calendarDensity" v-bind="calendarProps" @update:model-value="choose">
          <template v-if="$slots.footer" #footer><slot name="footer" /></template>
        </QuireCalendar>
      </div>
    </QuirePopoverContent>
  </QuirePopoverRoot>
</template>
