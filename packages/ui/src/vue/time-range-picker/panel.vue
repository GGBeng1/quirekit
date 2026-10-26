<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { QuireKitTimeRangeValue, TimeRangeEndpoint, TimeRangePanelProps } from "./types";
import { copyTimeRange, rangeEndsNextDay, timeRangeEndpointRules, timeRangeError } from "./value";
import { availableTimes, draftTime, timeDraft } from "../time-picker/value";
import TimeColumns from "../time-picker/columns.vue";
import QuireTabs from "../tabs/tabs.vue";
import { usePickerBottom } from '../shared/picker/context';
const bottom = usePickerBottom();
import QuireButton from "../button/button.vue";
import { useQuireKitMessages } from "../locale-provider/context";
const props = defineProps<TimeRangePanelProps>();
const emit = defineEmits<{ /** Atomic, complete validated range. */ confirm: [value: QuireKitTimeRangeValue]; /** Abandon both endpoint drafts. */ cancel: [] }>();
defineSlots<{ /** Host shortcuts change the whole draft without publishing it. */ footer?: (props: { setRange: (range: QuireKitTimeRangeValue) => void }) => unknown }>();
const selected = ref<string>(props.initialEndpoint);
const desktopEditors = ref<InstanceType<typeof TimeColumns>[]>([]);
const active = computed<TimeRangeEndpoint>(() => selected.value === "end" ? "end" : "start");
const columns = ref<InstanceType<typeof TimeColumns>>();
const drafts = ref({ start: timeDraft(props.value.start, props.hourCycle), end: timeDraft(props.value.end, props.hourCycle) });
const precision = computed(() => props.rules.granularity ?? "minute");
const text = useQuireKitMessages("timeRangePicker");
const pickerText = useQuireKitMessages("picker");
const rules = computed(() => ({ start: timeRangeEndpointRules(props.rules, "start"), end: timeRangeEndpointRules(props.rules, "end") }));
const hasCandidates = computed(() => ({ start: availableTimes(rules.value.start).length > 0, end: availableTimes(rules.value.end).length > 0 }));
const range = computed(() => ({ start: draftTime(drafts.value.start, props.hourCycle, precision.value), end: draftTime(drafts.value.end, props.hourCycle, precision.value) }));
const error = computed(() => timeRangeError(range.value, props.rules, pickerText.value));
const complete = computed(() => range.value.start !== null && range.value.end !== null);
const overnight = computed(() => rangeEndsNextDay(range.value, props.rules.allowOvernight ?? false));
const items = computed(() => [{ value: "start", label: text.value.start }, { value: "end", label: text.value.end }]);
const message = computed(() => error.value || (!hasCandidates.value[active.value] ? text.value.noTimes : !complete.value ? text.value.incomplete : overnight.value ? text.value.overnight : `${range.value.start} → ${range.value.end}`));
watch([() => props.value, () => props.hourCycle], () => { drafts.value = { start: timeDraft(props.value.start, props.hourCycle), end: timeDraft(props.value.end, props.hourCycle) }; });
/** @param value - Host shortcut range; complete validation remains at confirmation. */
async function setRange(value: QuireKitTimeRangeValue): Promise<void> { copyTimeRange(value); drafts.value = { start: timeDraft(value.start, props.hourCycle), end: timeDraft(value.end, props.hourCycle) }; await nextTick(); await Promise.all([columns.value, ...desktopEditors.value].map(view => view?.revealSelections())); }
/** Applies current wall-clock time to the active endpoint draft only, without rounding. */
async function now(): Promise<void> {
  const date = new Date();
  const time = [date.getHours(), date.getMinutes(), ...(precision.value === "second" ? [date.getSeconds()] : [])].map(unit => String(unit).padStart(2, "0")).join(":");
  drafts.value = { ...drafts.value, [active.value]: timeDraft(time, props.hourCycle) };
  await nextTick(); await Promise.all([columns.value, ...desktopEditors.value].map(view => view?.revealSelections()));
}
/** Revalidates both endpoints at the atomic confirmation boundary. */
function confirm(): void { if (complete.value && !timeRangeError(range.value, props.rules, pickerText.value)) emit("confirm", copyTimeRange(range.value)); }
</script>
<template>
  <div class="qk-time-picker__body">
    <QuireTabs v-if="bottom" v-model="selected" class="qk-time-range-picker__tabs" :label="label" :items="items" :lazy-mount="true" :unmount-on-exit="true">
      <template #content="{ selected: visible }">
        <TimeColumns v-if="visible" ref="columns" v-model="drafts[active]" :rules="rules[active]" :hour-cycle="hourCycle" :label="active === 'start' ? startLabel : endLabel" />
      </template>
    </QuireTabs>
    <div v-else class="qk-picker__range-editors">
      <section v-for="endpoint in (['start', 'end'] as const)" :key="endpoint" @focusin="selected = endpoint" @pointerdown="selected = endpoint">
        <h3 class="qk-picker__endpoint-title">{{ endpoint === 'start' ? startLabel : endLabel }}</h3>
        <TimeColumns ref="desktopEditors" v-model="drafts[endpoint]" :rules="rules[endpoint]" :hour-cycle="hourCycle" :label="endpoint === 'start' ? startLabel : endLabel" />
      </section>
    </div>
    <p class="qk-time-picker__message" :class="error && 'text-qk-danger-text'" role="status">{{ message }}</p>
    <div v-if="$slots.footer" class="qk-time-picker__shortcuts"><slot name="footer" :set-range="setRange" /></div>
    <div class="qk-time-picker__footer">
      <QuireButton size="sm" variant="text" @click="now">{{ pickerText.now }}</QuireButton>
      <span class="qk-time-picker__spacer" />
      <QuireButton size="sm" variant="text" @click="emit('cancel')">{{ pickerText.cancel }}</QuireButton>
      <QuireButton size="sm" variant="solid" color="primary" :disabled="!complete || Boolean(error)" @click="confirm">{{ pickerText.confirm }}</QuireButton>
    </div>
  </div>
</template>
