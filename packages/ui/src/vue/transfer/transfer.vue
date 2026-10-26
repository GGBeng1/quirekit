<script setup lang="ts">
import { useFieldContext } from '@ark-ui/vue/field';
import { computed, nextTick, reactive, ref, shallowRef, toRef, useAttrs, useId, watch } from 'vue';
import QuireButton from '../button/button.vue';
import QuireIcon from '../icon/icon.vue';
import { useChoiceState } from '../shared/choice-state/model';
import TransferPanel from './panel.vue';
import { transferItems, transferMove } from './model';
import { useQuireKitMessages } from '../locale-provider/context';
import type { QuireKitTransferChangeDetails, QuireKitTransferProps, QuireKitTransferSide, QuireKitTransferSlots } from './types';

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<QuireKitTransferProps>(), {
  hideLabel: false, searchable: false, density: 'regular',
  disabled: undefined, readOnly: undefined, required: undefined, invalid: undefined
});
const emit = defineEmits<{
  /** Request the complete target membership after a move. */
  'update:modelValue': [value: string[]];
  /** Report an explicit accepted move, separate from temporary row selection. */
  change: [details: QuireKitTransferChangeDetails];
  /** Expose native required validation for consumer feedback. */
  invalid: [event: Event];
}>();
defineSlots<QuireKitTransferSlots>();
const root = shallowRef<HTMLElement | null>(null);
const source = ref<InstanceType<typeof TransferPanel>>();
const target = ref<InstanceType<typeof TransferPanel>>();
const selectedSource = ref<string[]>([]);
const selectedTarget = ref<string[]>([]);
const field = useFieldContext();
const attrs = useAttrs();
const id = `qk-transfer-${useId()}`;
const disabled = computed(() => props.disabled ?? field?.value.disabled ?? false);
const readOnly = computed(() => props.readOnly ?? field?.value.readOnly ?? false);
const required = computed(() => props.required ?? field?.value.required ?? false);
const invalid = computed(() => props.invalid ?? field?.value.invalid ?? false);
const controlId = computed(() => props.id ?? field?.value.ids.control ?? `${id}-input`);
const labelId = computed(() => field?.value.ids.label ?? `${id}-label`);
const accessibleLabelId = computed(() => typeof attrs['aria-labelledby'] === 'string' ? attrs['aria-labelledby'] : labelId.value);
const description = computed(() => [attrs['aria-describedby'], field?.value.ariaDescribedby,
  invalid.value ? field?.value.ids.errorText : undefined].filter(Boolean).join(' ') || undefined);
const rootAttrs = computed(() => Object.fromEntries(Object.entries(attrs).filter(([key]) => !['aria-describedby', 'aria-labelledby', 'data-scope', 'data-part'].includes(key))));
const choiceProps = reactive({ modelValue: toRef(props, 'modelValue'), defaultValue: toRef(props, 'defaultValue'), form: toRef(props, 'form'), disabled, readOnly });
const { values, update } = useChoiceState(choiceProps, value => emit('update:modelValue', value), root);
const value = computed(() => [...new Set(values.value)]);
const sourceItems = computed(() => transferItems(props.items, value.value, 'source'));
const targetItems = computed(() => transferItems(props.items, value.value, 'target'));
const text = useQuireKitMessages('transfer');
const label = computed(() => props.label ?? text.value.label);
const add = computed(() => transferMove(props.items, value.value, selectedSource.value, 'target'));
const remove = computed(() => transferMove(props.items, value.value, selectedTarget.value, 'source'));
watch(values, () => { selectedSource.value = []; selectedTarget.value = []; });

/** Focus an existing visible Listbox, used by Field and form validation.
 * @param side - Requested list; defaults to source.
 */
function focus(side: QuireKitTransferSide = 'source'): void {
  if (!disabled.value) (side === 'source' ? source.value : target.value)?.focus();
}

/** Redirect the native label's focus to the source Listbox. */
function focusSource(): void { focus(); }

/** Apply a membership action, then retain focus at the originating list.
 * @param direction - Destination receiving the requested members.
 * @returns Completion after Vue has applied the new member projection.
 */
async function move(direction: QuireKitTransferSide): Promise<void> {
  if (disabled.value || readOnly.value) return;
  const next = direction === 'target' ? add.value : remove.value;
  if (!next.keys.length) return;
  update(next.value);
  emit('change', { ...next, direction });
  selectedSource.value = []; selectedTarget.value = [];
  await nextTick();
  focus(direction === 'target' ? 'source' : 'target');
}

/** Keep the browser's required check while giving feedback a visible focus target.
 * @param event - Native invalid event on the unnamed validation input.
 */
function onInvalid(event: Event): void {
  event.preventDefault(); emit('invalid', event); focus();
}
defineExpose({ focus });
</script>

<template>
  <div ref="root" v-bind="rootAttrs" class="qk-transfer" role="group"
    :aria-labelledby="accessibleLabelId" :aria-describedby="description"
    :aria-disabled="disabled || undefined" :aria-invalid="invalid || undefined"
    :data-invalid="invalid ? '' : undefined" :data-disabled="disabled ? '' : undefined" :data-readonly="readOnly ? '' : undefined">
    <label v-if="!field" :id="labelId" :for="controlId" :class="['qk-transfer__label', hideLabel && 'sr-only']">
      {{ label }}<span v-if="required" class="qk-transfer__required" aria-hidden="true">*</span>
    </label>
    <div class="qk-transfer__layout">
      <TransferPanel ref="source" v-model:selected="selectedSource" side="source" :label="sourceLabel ?? text.source" :items="sourceItems"
        :searchable="searchable" :disabled="disabled" :density="density">
        <template v-if="$slots.item" #item="state"><slot name="item" v-bind="state" /></template>
      </TransferPanel>
      <div class="qk-transfer__actions">
        <QuireButton size="sm" variant="outline" :disabled="disabled || readOnly || !add.keys.length" @click="move('target')">
          {{ text.add }}
          <template #trailing><span class="qk-transfer__arrow"><QuireIcon name="arrowRight" :size="16" /></span></template>
        </QuireButton>
        <QuireButton size="sm" variant="outline" :disabled="disabled || readOnly || !remove.keys.length" @click="move('source')">
          <template #leading><span class="qk-transfer__arrow"><QuireIcon name="arrowLeft" :size="16" /></span></template>
          {{ text.remove }}
        </QuireButton>
      </div>
      <TransferPanel ref="target" v-model:selected="selectedTarget" side="target" :label="targetLabel ?? text.target" :items="targetItems"
        :searchable="searchable" :disabled="disabled" :density="density" :unavailable="value.length - targetItems.length">
        <template v-if="$slots.item" #item="state"><slot name="item" v-bind="state" /></template>
      </TransferPanel>
    </div>
    <!-- Only target keys are successful controls; searches and temporary selections have no name. -->
    <input v-for="key in value" :key="key" type="hidden" :name="name" :value="key" :form="form" :disabled="disabled">
    <input :id="controlId" class="sr-only" tabindex="-1" :aria-label="label" :aria-describedby="description"
      :value="value.length ? 'selected' : ''" :form="form" :disabled="disabled" :readonly="readOnly" :required="required"
      @focus="focusSource" @invalid="onInvalid">
  </div>
</template>
