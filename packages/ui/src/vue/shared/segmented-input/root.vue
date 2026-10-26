<script setup lang="ts">
import { DateInput, useDateInput, type DateInputDateValue, type UseDateInputProps } from '@ark-ui/vue/date-input';
import { computed, nextTick, watch } from 'vue';
import type { SegmentedInputRootProps } from './types';
import { useQuireKitLocale } from '../../locale-provider/context';
// This internal contract exposes only the Ark fields used by date/time consumers.
const props = defineProps<SegmentedInputRootProps>();
const emit = defineEmits<{
  /** Complete value or an empty array, never a stale value behind missing segments. */
  'update:modelValue': [value: DateInputDateValue[]];
}>();
defineSlots<{ /** Ark anatomy supplied by the field. */ default: () => unknown }>();
const locale = useQuireKitLocale();
const initial = props.modelValue;
let published = key(initial);
const api = useDateInput(computed<UseDateInputProps>(() => ({
  ...Object.fromEntries(Object.entries(props).filter(([name, value]) => name !== 'modelValue' && value !== undefined)),
  // Segment order and Ark's own labels follow the active language.
  locale: locale.value,
  defaultValue: initial
})));

/** @param dates - Comparable complete dates. @returns Stable semantic identity across object copies. */
function key(dates: readonly DateInputDateValue[]): string { return dates.map(date => date.toString()).join('/'); }
/** @param dates - Parent-approved value, replacing the draft only on a genuine external edit. */
function synchronize(dates: DateInputDateValue[]): void {
  published = key(dates);
  if (dates.length) api.value.setValue(dates);
  else api.value.clearValue();
}
// The public empty value must not echo into Ark while the user retains other segments.
watch(() => key(props.modelValue), next => { if (next !== published) synchronize(props.modelValue); });
const complete = computed(() => !api.value.getSegments().some(segment => segment.type !== 'literal' && segment.isPlaceholder));
watch(() => `${complete.value}:${key(api.value.value)}`, async () => {
  if (props.disabled || props.readOnly) return;
  const next = complete.value ? api.value.value : [];
  const nextKey = key(next);
  if (nextKey === published) return;
  published = nextKey;
  emit('update:modelValue', next);
  // A controlled host may reject an edit; reconcile after its synchronous update settles.
  await nextTick();
  if (published === nextKey && key(props.modelValue) !== nextKey) synchronize(props.modelValue);
});
</script>
<template>
  <DateInput.RootProvider :value="api"><slot /></DateInput.RootProvider>
</template>
