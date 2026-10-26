<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from "vue";
import type { QuireKitTimeSinglePickerProps, TimeRules } from "./types";
import type { QuireKitTimeInputProps } from "../time-input/types";
import { timeError } from "./value";
import QuireTimeInput from "../time-input/time-input.vue";
import TimePanel from "./panel.vue";
import QuireIconButton from "../button/icon-button.vue";
import QuireIcon from "../icon/icon.vue";
import { useQuireKitMessages } from "../locale-provider/context";
import { PickerRoot as QuirePopoverRoot, PickerAnchor as QuirePopoverAnchor, PickerTrigger as QuirePopoverTrigger, PickerContent as QuirePopoverContent } from "../shared/picker";
const props = withDefaults(defineProps<QuireKitTimeSinglePickerProps>(), { defaultValue: null, size: "sm", width: "200px", hourCycle: 24, granularity: "minute", clearable: true, disabled: false, readOnly: false, open: undefined, defaultOpen: false, presentation: "auto", openOnFocus: true, hourStep: 1, minuteStep: 1, secondStep: 1 });
const emit = defineEmits<{ /** Complete time or empty field. */ "update:modelValue": [value: string | null]; /** Requested panel visibility. */ "update:open": [value: boolean] }>();
defineSlots<{ /** Decorative prefix inside the shared input. */ leading?: () => unknown; /** Host shortcuts change panel drafts using the same validation. */ footer?: (props: { setTime: (value: string) => void }) => unknown }>();
const text = useQuireKitMessages("timePicker");
const pickerText = useQuireKitMessages("picker");
const internal = ref(props.defaultValue), internalOpen = ref(props.defaultOpen);
const panel = ref<HTMLElement>(), trigger = ref<HTMLElement>();
const value = computed(() => props.modelValue === undefined ? internal.value : props.modelValue);
const opened = computed(() => !props.disabled && !props.readOnly && (props.open ?? internalOpen.value));
const rules = computed<TimeRules>(() => ({ min: props.min, max: props.max, hourStep: props.hourStep, minuteStep: props.minuteStep, secondStep: props.secondStep, granularity: props.granularity, isTimeUnavailable: props.isTimeUnavailable }));
const error = computed(() => timeError(value.value, rules.value, pickerText.value));
const triggerLabel = computed(() => text.value.openPanel(props.label));
const inputProps = computed(() => {
  const { open, defaultOpen, hourStep, minuteStep, secondStep, isTimeUnavailable, presentation, openOnFocus, ...input } = props;
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as unknown as QuireKitTimeInputProps;
});
/** @param next - Requested visibility, subject to host control and editing permissions. */
function setOpen(next: boolean): void { if (next && (props.disabled || props.readOnly)) return; internalOpen.value = next; emit("update:open", next); }
/** @param next - Direct field edit, clear, native reset, or confirmed panel time. */
function update(next: string | null): void { if (props.modelValue === undefined) internal.value = next; emit("update:modelValue", next); }
/** @param next - Complete draft revalidated before committing. */
function confirm(next: string): void { if (props.disabled || props.readOnly || timeError(next, rules.value, pickerText.value)) return; update(next); setOpen(false); }
/** @returns The first real Ark list navigation target. */
function initialFocus(): HTMLElement | null { return panel.value?.querySelector('[role="listbox"]') ?? null; }
/** @returns The resident panel trigger. */
function finalFocus(): HTMLElement | null { return trigger.value?.querySelector("button") ?? null; }
watch([() => props.disabled, () => props.readOnly], ([disabled, readOnly]) => { if (disabled || readOnly) setOpen(false); });

let associatedForm: HTMLFormElement | null = null;
/** @param event - Native reset, reconciled only after cancellation has been decided. */
function resetPanel(event: Event): void { queueMicrotask(() => { if (!event.defaultPrevented) setOpen(false); }); }
/** Binds the same native form as the inner TimeInput, including explicit external forms. */
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
      <QuireTimeInput v-bind="inputProps" :model-value="value" :invalid="invalid || Boolean(error)" :error-text="errorText || error" @update:model-value="update" @keydown.alt.down.prevent="setOpen(true)">
        <template v-if="$slots.leading" #leading><slot name="leading" /></template>
        <template #trailing><span ref="trigger" class="qk-time-picker__trigger"><QuirePopoverTrigger as-child><QuireIconButton :label="triggerLabel" size="xs" variant="text" :disabled="disabled || readOnly"><QuireIcon name="clock" :size="16" /></QuireIconButton></QuirePopoverTrigger></span></template>
      </QuireTimeInput>
    </QuirePopoverAnchor>
    <QuirePopoverContent :show-arrow="false" :aria-label="label" class="qk-time-picker__panel">
      <div v-if="opened" ref="panel"><TimePanel :value="value" :rules="rules" :hour-cycle="hourCycle" :label="label" @confirm="confirm" @cancel="setOpen(false)"><template v-if="$slots.footer" #footer="slotProps"><slot name="footer" v-bind="slotProps" /></template></TimePanel></div>
    </QuirePopoverContent>
  </QuirePopoverRoot>
</template>
