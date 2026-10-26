<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { DateTimePanelProps } from './types';
import { normalizeCivilDateTime } from './value';
import { currentCivilDateTime, dateTimeDraft, draftDateTime } from './draft';
import { dateTimeError, dateTimeTimeRules } from './rules';
import { availableTimes, draftTime } from '../time-picker/value';
import DateTimeEditor from './editor.vue';
import QuireButton from '../button/button.vue';
import { useQuireKitMessages } from '../locale-provider/context';
const props = defineProps<DateTimePanelProps>();
const emit = defineEmits<{ /** Complete civil value, validated at confirmation. */ confirm: [value: string]; /** Discard date and time drafts together. */ cancel: [] }>();
defineSlots<{ /** Explicit host shortcuts modify the draft only. */ footer?: (props: { setDateTime: (value: string) => void }) => unknown }>();
const precision = computed(() => props.rules.granularity ?? 'second');
const text = useQuireKitMessages('dateTimePicker');
const pickerText = useQuireKitMessages('picker');
const draft = ref(dateTimeDraft(props.value, props.hourCycle));
const editor = ref<InstanceType<typeof DateTimeEditor>>();
const clock = computed(() => draftTime(draft.value.time, props.hourCycle, precision.value));
const complete = computed(() => draftDateTime(draft.value, props.hourCycle, precision.value));
const error = computed(() => dateTimeError(complete.value, props.rules, pickerText.value));
const hasCandidates = computed(() => availableTimes(dateTimeTimeRules(draft.value.date, props.rules)).length > 0);
const message = computed(() => error.value || (!hasCandidates.value ? text.value.noTimes : complete.value ?? text.value.draft(draft.value.date, clock.value)));
// External values replace the whole draft; switching editing surfaces does not.
watch([() => props.value, () => props.hourCycle, precision], () => { draft.value = dateTimeDraft(props.value, props.hourCycle); });
/** @param next - Explicit civil shortcut, preserving invalid candidates for visible feedback. */
async function setDateTime(next: string): Promise<void> {
  draft.value = dateTimeDraft(normalizeCivilDateTime(next, precision.value), props.hourCycle);
  await nextTick(); await editor.value?.revealSelections();
}
/** Copies current civil fields only after an explicit user action. */
function now(): void { void setDateTime(currentCivilDateTime(precision.value)); }
/** Revalidates the atomic date/time pair immediately before publishing. */
function confirm(): void { if (complete.value && !dateTimeError(complete.value, props.rules, pickerText.value)) emit('confirm', complete.value); }
</script>
<template>
  <div class="qk-time-picker__body">
    <DateTimeEditor ref="editor" v-model="draft" :rules="rules" :label="label" :hour-cycle="hourCycle" :density="density" v-bind="{ ...(placeholderValue ? { placeholderValue } : {}), ...(startOfWeek === undefined ? {} : { startOfWeek }) }" />
    <p class="qk-time-picker__message" :class="error && 'text-qk-danger-text'" role="status">{{ message }}</p>
    <div v-if="$slots.footer" class="qk-time-picker__shortcuts"><slot name="footer" :set-date-time="setDateTime" /></div>
    <div class="qk-time-picker__footer">
      <QuireButton size="sm" variant="text" @click="now">{{ pickerText.now }}</QuireButton>
      <span class="qk-time-picker__spacer" />
      <QuireButton size="sm" variant="text" @click="emit('cancel')">{{ pickerText.cancel }}</QuireButton>
      <QuireButton size="sm" variant="solid" color="primary" :disabled="!complete || Boolean(error)" @click="confirm">{{ pickerText.confirm }}</QuireButton>
    </div>
  </div>
</template>
