<script setup lang="ts">
import PickerControlAnchor from "../shared/picker/control-anchor.vue";
import { computed, nextTick, onMounted, onScopeDispose, ref, useId, watch } from "vue";
import type { QuireKitTimeRangePickerProps, QuireKitTimeRangeValue, TimeRangeEndpoint, TimeRangeRules } from "./types";
import { copyTimeRange, rangeEndsNextDay, timeRangeError } from "./value";
import TimeEndpoint from "./endpoint.vue";
import RangePanel from "./panel.vue";
import QuireIconButton from "../button/icon-button.vue";
import QuireIcon from "../icon/icon.vue";
import { useQuireKitMessages } from "../locale-provider/context";
import { PickerRoot as QuirePopoverRoot, PickerAnchor as QuirePopoverAnchor, PickerTrigger as QuirePopoverTrigger, PickerContent as QuirePopoverContent } from "../shared/picker";
const props = withDefaults(defineProps<QuireKitTimeRangePickerProps>(), {
  defaultValue: () => ({ start: null, end: null }), size: "sm", width: "360px", hourCycle: 24, granularity: "minute",
  hideLabel: false, clearable: true, disabled: false, readOnly: false, required: false, invalid: false, allowOvernight: false,
  open: undefined, defaultOpen: false, presentation: "auto", openOnFocus: true, hourStep: 1, minuteStep: 1, secondStep: 1
});
const emit = defineEmits<{ /** Direct edits, reset or one confirmed complete range. */ "update:modelValue": [value: QuireKitTimeRangeValue]; /** Requested visibility under host control. */ "update:open": [value: boolean] }>();
defineSlots<{ /** Optional decorative prefix within the shared field. */ leading?: () => unknown; /** Host shortcuts modify the pending range only. */ footer?: (props: { setRange: (range: QuireKitTimeRangeValue) => void }) => unknown }>();
const id = useId(), root = ref<HTMLElement>(), trigger = ref<HTMLElement>(), panel = ref<HTMLElement>();
const internal = ref(copyTimeRange(props.defaultValue)), internalOpen = ref(props.defaultOpen), version = ref(0);
const focusedEndpoint = ref<TimeRangeEndpoint>();
const value = computed(() => copyTimeRange(props.modelValue ?? internal.value));
const opened = computed(() => !props.disabled && !props.readOnly && (props.open ?? internalOpen.value));
const text = useQuireKitMessages("timeRangePicker");
const pickerText = useQuireKitMessages("picker");
const rules = computed<TimeRangeRules>(() => ({ min: props.min, max: props.max, granularity: props.granularity, hourStep: props.hourStep, minuteStep: props.minuteStep, secondStep: props.secondStep, allowOvernight: props.allowOvernight, isTimeUnavailable: props.isTimeUnavailable, isRangeUnavailable: props.isRangeUnavailable }));
const validation = computed(() => timeRangeError(value.value, rules.value, pickerText.value));
const invalidState = computed(() => props.invalid || Boolean(validation.value));
const overnight = computed(() => rangeEndsNextDay(value.value, props.allowOvernight));
const message = computed(() => invalidState.value ? props.errorText || validation.value || props.description : [props.description, overnight.value ? text.value.overnight : ""].filter(Boolean).join(" "));
const endpoints = computed(() => [{ key: "start" as const, label: props.startLabel ?? text.value.startField(props.label) }, { key: "end" as const, label: props.endLabel ?? text.value.endField(props.label) }]);
const initialEndpoint = computed<TimeRangeEndpoint>(() => focusedEndpoint.value ?? (value.value.start && !value.value.end ? "end" : "start"));
const triggerLabel = computed(() => text.value.openPanel(props.label));
const bindings = computed(() => ({ ...(props.form ? { form: props.form } : {}), ...(props.placeholderValue ? { placeholderValue: props.placeholderValue } : {}), ...(message.value ? { describedBy: `${id}-message` } : {}) }));
/** @param next - Requested panel state, respecting editing permissions. */
function setOpen(next: boolean): void { if (next && (props.disabled || props.readOnly)) return; internalOpen.value = next; emit("update:open", next); }
/** @param next - New range with independent endpoint identities. */
function update(next: QuireKitTimeRangeValue): void { if (props.modelValue === undefined) internal.value = copyTimeRange(next); emit("update:modelValue", copyTimeRange(next)); }
/** @param endpoint - Edited side. @param next - Complete time or a partial-draft marker. */
function edit(endpoint: TimeRangeEndpoint, next: string | null): void { if (!props.disabled && !props.readOnly) update({ ...value.value, [endpoint]: next }); }
/** @param next - Complete panel range, checked again against the latest host rules. */
function confirm(next: QuireKitTimeRangeValue): void { if (props.disabled || props.readOnly || !next.start || !next.end || timeRangeError(next, rules.value, pickerText.value)) return; update(next); version.value += 1; setOpen(false); }
/** Clears committed endpoints and any uncommitted segment text, then restores the input focus. */
async function clear(): Promise<void> { update({ start: null, end: null }); version.value += 1; setOpen(false); await nextTick(); root.value?.querySelector<HTMLElement>('[role="spinbutton"]')?.focus(); }
/** @returns Selected endpoint tab as the initial keyboard navigation target. */
function initialFocus(): HTMLElement | null { return panel.value?.querySelector('[data-view="day"][data-part="table-cell-trigger"][tabindex="0"], [role="listbox"], [role="tab"][aria-selected="true"]') ?? null; }
/** @returns Stable resident opening action after dismissal. */
function finalFocus(): HTMLElement | null { return trigger.value?.querySelector("button") ?? null; }
watch([() => props.disabled, () => props.readOnly], ([disabled, readOnly]) => { if (disabled || readOnly) setOpen(false); });
let currentForm: HTMLFormElement | null = null;
/** @param event - Native reset observed only after cancellation is decided. */
function reset(event: Event): void { queueMicrotask(() => { if (event.defaultPrevented) return; update(props.defaultValue); version.value += 1; setOpen(false); focusedEndpoint.value = undefined; }); }
/** Binds one reset handler to the same form as both endpoint hidden inputs. */
function bindForm(): void { currentForm?.removeEventListener("reset", reset); currentForm = root.value?.querySelector("input")?.form ?? null; currentForm?.addEventListener("reset", reset); }
onMounted(bindForm);
watch(() => props.form, bindForm, { flush: "post" });
onScopeDispose(() => currentForm?.removeEventListener("reset", reset));
</script>
<template>
  <div ref="root" class="qk-time-input" :style="{ width: '100%', maxWidth: width }" role="group" :aria-label="label">
    <p :class="hideLabel ? 'sr-only' : 'qk-time-input__label qk-time-range-picker__label'">{{ label }}<span v-if="required" aria-hidden="true"> *</span></p>
    <QuirePopoverRoot :label="label" :disabled="disabled || readOnly" :presentation="presentation" :open-on-focus="openOnFocus" :open="opened" :initial-focus-el="initialFocus" :final-focus-el="finalFocus" @update:open="setOpen">
      <QuirePopoverAnchor>
        <PickerControlAnchor>
          <div :class="['qk-time-input__control', 'qk-time-range-picker__control', `qk-time-range-picker__control--${size}`]" :data-invalid="invalidState ? '' : undefined" :data-disabled="disabled ? '' : undefined" @keydown.alt.down.prevent="setOpen(true)">
            <span v-if="$slots.leading" class="qk-time-input__adornment" aria-hidden="true"><slot name="leading" /></span>
            <template v-for="(endpoint, index) in endpoints" :key="`${endpoint.key}-${version}`">
              <span v-if="index" class="qk-time-range-picker__separator" aria-hidden="true">→</span>
              <TimeEndpoint :model-value="value[endpoint.key]" :label="endpoint.label" :hour-cycle="hourCycle" :granularity="granularity" :disabled="disabled" :read-only="readOnly" :required="required" :invalid="invalidState" v-bind="{ ...bindings, ...(name ? { name: `${name}[${endpoint.key}]` } : {}) }" @focusin="focusedEndpoint = endpoint.key" @update:model-value="edit(endpoint.key, $event)" />
            </template>
            <span class="qk-time-range-picker__actions">
              <QuireIconButton v-if="clearable && !disabled && !readOnly" :label="text.clear" size="xs" variant="text" @pointerdown.prevent @click="clear"><QuireIcon name="close" :size="12" /></QuireIconButton>
              <span ref="trigger" class="qk-time-picker__trigger"><QuirePopoverTrigger as-child><QuireIconButton :label="triggerLabel" size="xs" variant="text" :disabled="disabled || readOnly"><QuireIcon name="clock" :size="16" /></QuireIconButton></QuirePopoverTrigger></span>
            </span>
          </div>
        </PickerControlAnchor>
      </QuirePopoverAnchor>
      <QuirePopoverContent :show-arrow="false" :aria-label="label" class="qk-time-picker__panel">
        <div v-if="opened" ref="panel"><RangePanel :value="value" :rules="rules" :hour-cycle="hourCycle" :label="label" :start-label="endpoints[0]!.label" :end-label="endpoints[1]!.label" :initial-endpoint="initialEndpoint" @confirm="confirm" @cancel="setOpen(false)"><template v-if="$slots.footer" #footer="slotProps"><slot name="footer" v-bind="slotProps" /></template></RangePanel></div>
      </QuirePopoverContent>
    </QuirePopoverRoot>
    <p v-if="message" :id="`${id}-message`" :class="['qk-time-input__message', invalidState && 'qk-time-input__message--invalid']">{{ message }}</p>
  </div>
</template>
