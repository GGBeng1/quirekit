<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { TimePanelProps } from "./types";
import { availableTimes, draftTime, timeDraft, timeError } from "./value";
import TimeColumns from "./columns.vue";
import QuireButton from "../button/button.vue";
import { useQuireKitMessages } from "../locale-provider/context";
const props = defineProps<TimePanelProps>();
const emit = defineEmits<{ /** Complete validated time. */ confirm: [value: string]; /** Dismiss without publishing a draft. */ cancel: [] }>();
defineSlots<{ /** Extra host shortcuts modify the draft, never commit implicitly. */ footer?: (props: { setTime: (time: string) => void }) => unknown }>();
const columns = ref<InstanceType<typeof TimeColumns>>();
const draft = ref(timeDraft(props.value, props.hourCycle));
const precision = computed(() => props.rules.granularity ?? "minute");
const text = useQuireKitMessages("timePicker");
const pickerText = useQuireKitMessages("picker");
const allowed = computed(() => availableTimes(props.rules));
const complete = computed(() => draftTime(draft.value, props.hourCycle, precision.value));
const error = computed(() => timeError(complete.value, props.rules, pickerText.value));
const message = computed(() => allowed.value.length === 0 ? text.value.noTimes : error.value || (complete.value ?? text.value.incomplete));
watch([() => props.value, () => props.hourCycle], () => { draft.value = timeDraft(props.value, props.hourCycle); });
/** @param time - Explicit host shortcut, checked by the same confirmation validation. */
async function setTime(time: string): Promise<void> { draft.value = timeDraft(time, props.hourCycle); await nextTick(); await columns.value?.revealSelections(); }
/** Chooses the device's current wall-clock time as a draft, without silently rounding steps. */
function now(): void {
  const date = new Date();
  void setTime([date.getHours(), date.getMinutes(), ...(precision.value === "second" ? [date.getSeconds()] : [])].map(value => String(value).padStart(2, "0")).join(":"));
}
/** Validates at activation time so a changed rule cannot publish a stale allowed value. */
function confirm(): void { if (complete.value && !timeError(complete.value, props.rules)) emit("confirm", complete.value); }
</script>
<template>
  <div class="qk-time-picker__body">
    <TimeColumns ref="columns" v-model="draft" :rules="rules" :hour-cycle="hourCycle" :label="label" />
    <p class="qk-time-picker__message" :class="error && 'text-qk-danger-text'" role="status">{{ message }}</p>
    <div v-if="$slots.footer" class="qk-time-picker__shortcuts"><slot name="footer" :set-time="setTime" /></div>
    <div class="qk-time-picker__footer">
      <QuireButton size="sm" variant="text" @click="now">{{ pickerText.now }}</QuireButton>
      <span class="qk-time-picker__spacer" />
      <QuireButton size="sm" variant="text" @click="emit('cancel')">{{ pickerText.cancel }}</QuireButton>
      <QuireButton size="sm" color="primary" variant="solid" :disabled="!complete || Boolean(error) || !allowed.length" @click="confirm">{{ pickerText.confirm }}</QuireButton>
    </div>
  </div>
</template>
