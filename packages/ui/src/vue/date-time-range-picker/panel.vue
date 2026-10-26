<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { DateTimeRangeEndpoint, DateTimeRangePanelProps, QuireKitDateTimeRangeValue } from './types';
import { copyDateTimeRange, dateTimeRangeEndpointRules, dateTimeRangeError } from './value';
import { currentCivilDateTime, dateTimeDraft, draftDateTime } from '../date-time-picker/draft';
import { dateTimeTimeRules } from '../date-time-picker/rules';
import { availableTimes } from '../time-picker/value';
import { completesEndpoint } from './draft';
import type { DateTimeDraft } from '../date-time-picker/types';
import DateTimeEditor from '../date-time-picker/editor.vue';
import QuireSegmented from '../segmented/segmented.vue';
import { vContentMotion } from '../shared/motion/content';
import { usePickerBottom } from '../shared/picker/context';
const bottom = usePickerBottom();
import QuireButton from '../button/button.vue';
import { useQuireKitMessages } from '../locale-provider/context';
const props = defineProps<DateTimeRangePanelProps>();
const emit = defineEmits<{ /** Complete range committed once after validation. */ confirm: [value: QuireKitDateTimeRangeValue]; /** Discard both endpoint drafts. */ cancel: []; /** Active endpoint drives the input's location indicator. */ 'update:endpoint': [value: DateTimeRangeEndpoint] }>();
defineSlots<{ /** Explicit shortcuts edit the whole pending range. */ footer?: (props: { setRange: (value: QuireKitDateTimeRangeValue) => void }) => unknown }>();
const selected = ref<string | null>(props.initialEndpoint), editor = ref<InstanceType<typeof DateTimeEditor>>();
const desktopEditors = ref<InstanceType<typeof DateTimeEditor>[]>([]);
const single = computed(() => bottom.value || props.rangeLayout === 'single');
const active = computed<DateTimeRangeEndpoint>(() => selected.value === 'end' ? 'end' : 'start');
const precision = computed(() => props.rules.granularity ?? 'second');
const text = useQuireKitMessages('dateTimeRangePicker');
const pickerText = useQuireKitMessages('picker');
const drafts = ref({ start: dateTimeDraft(props.value.start, props.hourCycle), end: dateTimeDraft(props.value.end, props.hourCycle) });
const range = computed(() => ({ start: draftDateTime(drafts.value.start, props.hourCycle, precision.value), end: draftDateTime(drafts.value.end, props.hourCycle, precision.value) }));
const error = computed(() => dateTimeRangeError(range.value, props.rules, pickerText.value));
const complete = computed(() => range.value.start !== null && range.value.end !== null);
const rules = computed(() => dateTimeRangeEndpointRules(props.rules, active.value));
const hasCandidates = computed(() => availableTimes(dateTimeTimeRules(drafts.value[active.value].date, rules.value)).length > 0);
const items = computed(() => [{ value: 'start', label: text.value.start }, { value: 'end', label: text.value.end }]);
const message = computed(() => error.value || (!hasCandidates.value ? text.value.noTimes : !complete.value ? text.value.incomplete : `${range.value.start} → ${range.value.end}`));
watch(() => props.initialEndpoint, value => { selected.value = value; });
watch(active, value => emit('update:endpoint', value));
// Only external values reset both endpoints; navigating the editor leaves partial units intact.
watch([() => props.value, () => props.hourCycle, precision], () => { drafts.value = { start: dateTimeDraft(props.value.start, props.hourCycle), end: dateTimeDraft(props.value.end, props.hourCycle) }; });
/** @param value - Host shortcut, preserving independent endpoints and visible validation errors. */
async function setRange(value: QuireKitDateTimeRangeValue): Promise<void> {
  const normalized = copyDateTimeRange(value, precision.value);
  drafts.value = { start: dateTimeDraft(normalized.start, props.hourCycle), end: dateTimeDraft(normalized.end, props.hourCycle) };
  await nextTick(); await Promise.all([editor.value, ...desktopEditors.value].map(view => view?.revealSelections()));
}
/** Replaces only the active endpoint after the user explicitly requests current civil fields. */
async function now(): Promise<void> {
  drafts.value = { ...drafts.value, [active.value]: dateTimeDraft(currentCivilDateTime(precision.value), props.hourCycle) };
  await nextTick(); await Promise.all([editor.value, ...desktopEditors.value].map(view => view?.revealSelections()));
}
/**
 * Keeps missing units empty and advances only when a new endpoint becomes complete.
 * @param endpoint - Endpoint whose editor emitted the change.
 * @param draft - Explicit date or time selection, without inferred clock values.
 */
async function updateDraft(endpoint: DateTimeRangeEndpoint, draft: DateTimeDraft): Promise<void> {
  const advance = single.value && endpoint === 'start' && completesEndpoint(drafts.value.start, draft, dateTimeRangeEndpointRules(props.rules, endpoint), props.hourCycle);
  drafts.value = { ...drafts.value, [endpoint]: draft };
  if (advance) {
    selected.value = 'end';
    await nextTick();
    editor.value?.focusDate();
  }
}
/** Commits a complete valid pair without changing endpoint order. */
function confirm(): void { if (complete.value && !dateTimeRangeError(range.value, props.rules, pickerText.value)) emit('confirm', copyDateTimeRange(range.value, precision.value)); }
</script>
<template>
  <div class="qk-time-picker__body">
    <div v-if="single" v-content-motion="active" class="qk-date-time-range-picker__editor">
      <QuireSegmented v-if="bottom" v-model="selected" :label="text.endpointSwitch(label)" :items="items" equal />
        <DateTimeEditor :key="active" ref="editor" :model-value="drafts[active]" @update:model-value="updateDraft(active, $event)" :rules="rules" :hour-cycle="hourCycle" :density="density" :label="active === 'start' ? startLabel : endLabel" v-bind="{ ...(placeholderValue ? { placeholderValue } : {}), ...(startOfWeek === undefined ? {} : { startOfWeek }) }" />
    </div>
    <div v-else class="qk-picker__range-editors">
      <section v-for="endpoint in (['start', 'end'] as const)" :key="endpoint" @focusin="selected = endpoint" @pointerdown="selected = endpoint">
        <DateTimeEditor ref="desktopEditors" :model-value="drafts[endpoint]" @update:model-value="updateDraft(endpoint, $event)" :rules="dateTimeRangeEndpointRules(props.rules, endpoint)" :label="endpoint === 'start' ? startLabel : endLabel" :hour-cycle="hourCycle" :density="density" v-bind="{ ...(placeholderValue ? { placeholderValue } : {}), ...(startOfWeek === undefined ? {} : { startOfWeek }) }" />
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
