<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from "vue";
import type { QuireKitDateTimePickerProps, DateTimeRules } from "./types";
import { dateTimeError } from "./rules";
import DateTimeInput from "./input.vue";
import DateTimePanel from "./panel.vue";
import QuireIconButton from "../button/icon-button.vue";
import QuireIcon from "../icon/icon.vue";
import { useQuireKitMessages } from "../locale-provider/context";
import { PickerRoot as QuirePopoverRoot, PickerAnchor as QuirePopoverAnchor, PickerTrigger as QuirePopoverTrigger, PickerContent as QuirePopoverContent } from "../shared/picker";
const props = withDefaults(defineProps<QuireKitDateTimePickerProps>(), { defaultValue: null, size: "sm", width: "360px", hourCycle: 24, granularity: "second", calendarDensity: "comfortable", clearable: true, disabled: false, readOnly: false, open: undefined, defaultOpen: false, presentation: "auto", openOnFocus: true, hourStep: 1, minuteStep: 1, secondStep: 1 });
const emit = defineEmits<{ /** Complete civil date-time or empty field. */ "update:modelValue": [value: string | null]; /** Requested panel visibility. */ "update:open": [value: boolean] }>();
defineSlots<{ /** Decorative prefix inside the shared date-time input. */ leading?: () => unknown; /** Host shortcuts change panel drafts using the same validation. */ footer?: (props: { setDateTime: (value: string) => void }) => unknown }>();
const text = useQuireKitMessages("dateTimePicker");
const pickerText = useQuireKitMessages("picker");
const internal = ref(props.defaultValue), internalOpen = ref(props.defaultOpen);
const panel = ref<HTMLElement>(), trigger = ref<HTMLElement>();
const value = computed(() => props.modelValue === undefined ? internal.value : props.modelValue);
const opened = computed(() => !props.disabled && !props.readOnly && (props.open ?? internalOpen.value));
const rules = computed<DateTimeRules>(() => ({ min: props.min, max: props.max, hourStep: props.hourStep, minuteStep: props.minuteStep, secondStep: props.secondStep, granularity: props.granularity, isDateUnavailable: props.isDateUnavailable, isDateTimeUnavailable: props.isDateTimeUnavailable }));
const error = computed(() => dateTimeError(value.value, rules.value, pickerText.value));
const inputProps = computed(() => Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined)) as unknown as QuireKitDateTimePickerProps);
const triggerLabel = computed(() => text.value.openPanel(props.label));
/** @param next - Requested visibility, subject to host control and editing permissions. */
function setOpen(next: boolean): void { if (next && (props.disabled || props.readOnly)) return; internalOpen.value = next; emit("update:open", next); }
/** @param next - Direct field edit, clear, native reset, or confirmed panel date-time. */
function update(next: string | null): void { if (props.modelValue === undefined) internal.value = next; emit("update:modelValue", next); }
/** @param next - Complete draft revalidated before committing. */
function confirm(next: string): void { if (props.disabled || props.readOnly || dateTimeError(next, rules.value, pickerText.value)) return; update(next); setOpen(false); }
/** @returns The active date/time tab, giving both editing surfaces a predictable entry. */
function initialFocus(): HTMLElement | null { return panel.value?.querySelector('[data-view="day"][data-part="table-cell-trigger"][tabindex="0"], [role="listbox"], [role="tab"][aria-selected="true"]') ?? null; }
/** @returns The resident panel trigger. */
function finalFocus(): HTMLElement | null { return trigger.value?.querySelector("button") ?? null; }
watch([() => props.disabled, () => props.readOnly], ([disabled, readOnly]) => { if (disabled || readOnly) setOpen(false); });

let associatedForm: HTMLFormElement | null = null;
/** @param event - Native reset, reconciled only after cancellation has been decided. */
function resetPanel(event: Event): void { queueMicrotask(() => { if (!event.defaultPrevented) setOpen(false); }); }
/** Binds the same native form as the inner segmented input, including explicit external forms. */
function bindForm(): void {
  associatedForm?.removeEventListener("reset", resetPanel);
  const owner = trigger.value?.ownerDocument;
  const form = props.form ? owner?.getElementById(props.form) : trigger.value?.closest("form");
  associatedForm = form?.tagName === "FORM" ? form as HTMLFormElement : null;
  associatedForm?.addEventListener("reset", resetPanel);
}
onMounted(bindForm);
watch(() => props.form, bindForm, { flush: "post" });
onScopeDispose(() => associatedForm?.removeEventListener("reset", resetPanel));
</script>
<template>
  <QuirePopoverRoot :label="label" :disabled="disabled || readOnly" :presentation="presentation" :open-on-focus="openOnFocus" :open="opened" :initial-focus-el="initialFocus" :final-focus-el="finalFocus" @update:open="setOpen">
    <QuirePopoverAnchor>
      <DateTimeInput v-bind="inputProps" :model-value="value" :invalid="invalid || Boolean(error)" :error-text="errorText || error" @update:model-value="update" @keydown.alt.down.prevent="setOpen(true)">
        <template v-if="$slots.leading" #leading><slot name="leading" /></template>
        <template #trailing><span ref="trigger" class="qk-time-picker__trigger"><QuirePopoverTrigger as-child><QuireIconButton :label="triggerLabel" size="xs" variant="text" :disabled="disabled || readOnly"><QuireIcon name="calendar" :size="16" /></QuireIconButton></QuirePopoverTrigger></span></template>
      </DateTimeInput>
    </QuirePopoverAnchor>
    <QuirePopoverContent :show-arrow="false" :aria-label="label" class="qk-time-picker__panel qk-date-time-picker__panel">
      <div v-if="opened" ref="panel"><DateTimePanel :value="value" :rules="rules" :density="calendarDensity" v-bind="{ ...(placeholderValue ? { placeholderValue } : {}), ...(startOfWeek === undefined ? {} : { startOfWeek }) }" :hour-cycle="hourCycle" :label="label" @confirm="confirm" @cancel="setOpen(false)"><template v-if="$slots.footer" #footer="slotProps"><slot name="footer" v-bind="slotProps" /></template></DateTimePanel></div>
    </QuirePopoverContent>
  </QuirePopoverRoot>
</template>
