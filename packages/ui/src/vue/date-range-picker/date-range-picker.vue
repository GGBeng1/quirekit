<script setup lang="ts">
import PickerControlAnchor from "../shared/picker/control-anchor.vue";
import { computed, nextTick, onMounted, onScopeDispose, ref, useId, watch } from 'vue';
import type { QuireKitDateRangePickerProps, QuireKitDateRangeValue } from './types';
import type { QuireKitCalendarValue } from '../calendar/types';
import { calendarRange, copyDateRange, dateRangeError } from './value';
import DateRangeEndpoint from './endpoint.vue';
import QuireCalendar from '../calendar/calendar.vue';
import QuireIconButton from '../button/icon-button.vue';
import QuireIcon from '../icon/icon.vue';
import { useQuireKitMessages } from "../locale-provider/context";
import { PickerRoot as QuirePopoverRoot, PickerAnchor as QuirePopoverAnchor, PickerTrigger as QuirePopoverTrigger, PickerContent as QuirePopoverContent } from "../shared/picker";
const props = withDefaults(defineProps<QuireKitDateRangePickerProps>(), {
  dateFormat: "iso", defaultValue: () => ({ start: null, end: null }), size: 'sm', width: '360px',
  open: undefined, defaultOpen: false, presentation: "auto", openOnFocus: true, calendarDensity: 'comfortable', numberOfMonths: 2,
  disabled: false, readOnly: false, required: false, invalid: false, clearable: true, hideLabel: false, allowNonContiguousRange: false
});
const emit = defineEmits<{
  /** Field edits and complete calendar selections share this value. */ 'update:modelValue': [value: QuireKitDateRangeValue];
  /** Requested popup visibility. */ 'update:open': [open: boolean];
}>();
defineSlots<{
  /** Optional prefix inside the range field. */ leading?: () => unknown;
  /** Host shortcuts use the same range validation before committing. */ footer?: (props: { selectRange: (value: QuireKitDateRangeValue) => void }) => unknown;
}>();
const id = useId();
const root = ref<HTMLElement>();
const trigger = ref<HTMLElement>();
const panel = ref<HTMLElement>();
const version = ref(0);
const internal = ref(copyDateRange(props.defaultValue));
const internalOpen = ref(props.defaultOpen);
const value = computed(() => copyDateRange(props.modelValue ?? internal.value));
const opened = computed(() => !props.disabled && !props.readOnly && (props.open ?? internalOpen.value));
const draft = ref<string[]>([]);
const shortcutError = ref('');
const text = useQuireKitMessages('dateRangePicker');
const pickerText = useQuireKitMessages('picker');
const calendarText = useQuireKitMessages('datePicker');
const triggerLabel = computed(() => calendarText.value.openCalendar(props.label));
const validation = computed(() => dateRangeError(value.value, props, pickerText.value));
const invalidState = computed(() => props.invalid || Boolean(validation.value));
const message = computed(() => invalidState.value ? props.errorText || validation.value || props.description : props.description);
const endpoints = computed(() => [
  { key: 'start' as const, label: props.startLabel ?? text.value.startField(props.label) },
  { key: 'end' as const, label: props.endLabel ?? text.value.endField(props.label) }
]);
const endpointBindings = computed(() => ({ ...(props.form ? { form: props.form } : {}), ...(props.placeholderValue ? { placeholderValue: props.placeholderValue } : {}), ...(message.value ? { describedBy: `${id}-message` } : {}) }));
const calendarBindings = computed(() => ({
  ...(props.min ? { min: props.min } : {}), ...(props.max ? { max: props.max } : {}), ...(props.timeZone ? { timeZone: props.timeZone } : {}),
  ...(props.startOfWeek !== undefined ? { startOfWeek: props.startOfWeek } : {}), ...(props.isDateUnavailable ? { isDateUnavailable: props.isDateUnavailable } : {}),
  ...(value.value.start || value.value.end || props.placeholderValue ? { defaultFocusedValue: value.value.start ?? value.value.end ?? props.placeholderValue! } : {})
}));
/** @param next - Requested popup visibility; opening starts a cancellable draft. */
function setOpen(next: boolean): void { if (next && (props.disabled || props.readOnly)) return; internalOpen.value = next; emit('update:open', next); }
watch(opened, () => { draft.value = calendarRange(value.value); shortcutError.value = ''; }, { immediate: true });
watch(() => props.modelValue, () => { draft.value = calendarRange(value.value); shortcutError.value = ''; });
watch([() => props.disabled, () => props.readOnly], ([disabled, readOnly]) => { if (disabled || readOnly) setOpen(false); });
/** @param next - New shared range, preserving each endpoint's editing intent. */
function update(next: QuireKitDateRangeValue): void { if (props.modelValue === undefined) internal.value = copyDateRange(next); emit('update:modelValue', copyDateRange(next)); }
/** @param key - Edited endpoint. @param next - Complete date or incomplete marker from Ark. */
function edit(key: 'start' | 'end', next: string | null): void { if (!props.disabled && !props.readOnly) update({ ...value.value, [key]: next }); }
/** @param next - Complete range selected by a calendar or host shortcut. */
function selectRange(next: QuireKitDateRangeValue): void {
  if (props.disabled || props.readOnly) return;
  shortcutError.value = dateRangeError(next, props, pickerText.value) || (!next.start || !next.end ? text.value.incomplete : '');
  if (shortcutError.value) return;
  update(next); version.value += 1; setOpen(false);
}
/** @param next - Ark range draft; only a complete pair commits to the field. */
function choose(next: QuireKitCalendarValue): void { if (!Array.isArray(next)) return; draft.value = [...next]; shortcutError.value = ''; if (next.length === 2) selectRange({ start: next[0]!, end: next[1]! }); }
/** Clears both committed dates and incomplete segment drafts without reducing the click target. */
async function clear(): Promise<void> { update({ start: null, end: null }); version.value += 1; setOpen(false); await nextTick(); root.value?.querySelector<HTMLElement>('[role="spinbutton"]')?.focus(); }
/** @returns Current date navigation target in the portalled panel. */
function initialFocus(): HTMLElement | null { return panel.value?.querySelector('[data-view="day"][data-part="table-cell-trigger"][tabindex="0"]') ?? null; }
/** @returns The resident opening action after popup dismissal. */
function finalFocus(): HTMLElement | null { return trigger.value?.querySelector('button') ?? null; }
let currentForm: HTMLFormElement | null = null;
/** @param event - Cancellable native reset; handled once for both endpoints. */
function reset(event: Event): void { queueMicrotask(() => { if (event.defaultPrevented) return; update(props.defaultValue); version.value += 1; setOpen(false); }); }
/** Associates range reset with the same native form as both serialized endpoints. */
function bindForm(): void { currentForm?.removeEventListener('reset', reset); currentForm = root.value?.querySelector('input')?.form ?? null; currentForm?.addEventListener('reset', reset); }
onMounted(bindForm);
watch(() => props.form, bindForm, { flush: 'post' });
onScopeDispose(() => currentForm?.removeEventListener('reset', reset));
</script>
<template>
  <div ref="root" class="qk-date-input" :style="{ width: '100%', maxWidth: width }" role="group" :aria-label="label">
    <p :class="hideLabel ? 'sr-only' : 'qk-date-input__label qk-date-range-picker__label'">{{ label }}<span v-if="required" aria-hidden="true"> *</span></p>
    <QuirePopoverRoot :label="label" :disabled="disabled || readOnly" :presentation="presentation" :open-on-focus="openOnFocus" :open="opened" :initial-focus-el="initialFocus" :final-focus-el="finalFocus" @update:open="setOpen">
      <QuirePopoverAnchor>
        <PickerControlAnchor>
          <div :class="['qk-date-input__control', 'qk-date-range-picker__control', `qk-date-range-picker__control--${size}`]" :data-invalid="invalidState ? '' : undefined" :data-disabled="disabled ? '' : undefined" @keydown.alt.down.prevent="setOpen(true)">
            <span v-if="$slots.leading" class="qk-date-input__adornment" aria-hidden="true"><slot name="leading" /></span>
            <template v-for="(endpoint, index) in endpoints" :key="`${endpoint.key}-${version}`">
              <span v-if="index" class="qk-date-range-picker__separator" aria-hidden="true">→</span>
              <DateRangeEndpoint :model-value="value[endpoint.key]" :label="endpoint.label" :date-format="dateFormat" :disabled="disabled" :read-only="readOnly" :required="required" :invalid="invalidState" v-bind="{ ...endpointBindings, ...(name ? { name: `${name}[${endpoint.key}]` } : {}) }" @update:model-value="edit(endpoint.key, $event)" />
            </template>
            <span class="qk-date-range-picker__actions">
              <QuireIconButton v-if="clearable && !disabled && !readOnly" :label="text.clear" size="xs" variant="text" @pointerdown.prevent @click="clear"><QuireIcon name="close" :size="12" /></QuireIconButton>
              <span ref="trigger" class="qk-date-picker__trigger"><QuirePopoverTrigger as-child><QuireIconButton :label="triggerLabel" size="xs" variant="text" :disabled="disabled || readOnly"><QuireIcon name="calendar" :size="16" /></QuireIconButton></QuirePopoverTrigger></span>
            </span>
          </div>
        </PickerControlAnchor>
      </QuirePopoverAnchor>
      <QuirePopoverContent v-slot="{ bottom }" :show-arrow="false" :aria-label="label" :class="['qk-date-range-picker__panel', `qk-date-picker__panel--${calendarDensity}`]" :style="{ '--qk-calendar-month-count': numberOfMonths }">
        <div v-if="opened" ref="panel">
          <QuireCalendar :label="label" selection-mode="range" :model-value="draft" :density="calendarDensity" :number-of-months="bottom ? 1 : numberOfMonths" :allow-non-contiguous-range="allowNonContiguousRange" v-bind="calendarBindings" @update:model-value="choose">
            <template v-if="shortcutError || draft.length < 2 || $slots.footer" #footer>
              <p v-if="shortcutError || draft.length < 2" class="qk-date-range-picker__status" role="status">{{ shortcutError || (draft.length === 1 ? text.chooseEnd : text.chooseBoth) }}</p>
              <slot name="footer" :select-range="selectRange" />
            </template>
          </QuireCalendar>
        </div>
      </QuirePopoverContent>
    </QuirePopoverRoot>
    <p v-if="message" :id="`${id}-message`" :class="['qk-date-input__message', invalidState && 'qk-date-input__message--invalid']">{{ message }}</p>
  </div>
</template>
