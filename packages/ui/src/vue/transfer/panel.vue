<script setup lang="ts">
import { computed, ref, shallowRef, useId, watch } from 'vue';
import QuireCheckbox from '../checkbox/checkbox.vue';
import QuireInput from '../input/input.vue';
import QuireListbox from '../listbox/listbox.vue';
import ChoiceFieldItem from '../shared/choice-state/field-item.vue';
import { transferFilter, transferToggleAll } from './model';
import { useQuireKitMessages } from '../locale-provider/context';
import type { QuireKitTransferItem, QuireKitTransferSide, QuireKitTransferSlots } from './types';
import type { QuireKitListDensity } from '../../components/control';

/** Internal composition of one independently searchable Listbox. */
interface Props {
  /** Side used by membership actions and public row slots. */
  readonly side: QuireKitTransferSide;
  /** Complete known members on this side. */
  readonly items: readonly QuireKitTransferItem[];
  /** Visible side name. */
  readonly label: string;
  /** Whether the search control is present. */
  readonly searchable: boolean;
  /** Current whole-control disabled state. */
  readonly disabled: boolean;
  /** List row density. */
  readonly density: QuireKitListDensity;
  /** Number of preserved target keys absent from known data. */
  readonly unavailable?: number;
}
const props = defineProps<Props>();
const text = useQuireKitMessages('transfer');
const selected = defineModel<string[]>('selected', { required: true });
defineSlots<QuireKitTransferSlots>();
const root = shallowRef<HTMLElement>();
const id = `qk-transfer-panel-${useId()}`;
const query = ref('');
const visible = computed(() => transferFilter(props.items, props.searchable ? query.value : ''));
const enabled = computed(() => visible.value.filter(item => !item.disabled));
const checked = computed(() => enabled.value.length > 0 && enabled.value.every(item => selected.value.includes(item.value))
  ? true : selected.value.length > 0 ? 'indeterminate' as const : false);

watch(query, () => { selected.value = []; });
watch(() => props.items, items => {
  const available = new Set(items.filter(item => !item.disabled).map(item => item.value));
  const next = selected.value.filter(key => available.has(key));
  if (next.length !== selected.value.length) selected.value = next;
});

/** Toggle the current visible enabled range without touching target membership. */
function toggleAll(): void {
  if (!props.disabled) selected.value = transferToggleAll(visible.value, selected.value);
}

/** Focus Ark's existing list navigation target without taking over its controller. */
function focus(): void {
  root.value?.querySelector<HTMLElement>('[role="listbox"]')?.focus({ preventScroll: true });
}
defineExpose({ focus });
</script>

<template>
  <section ref="root" :data-transfer-side="side" :aria-label="label" class="qk-transfer__panel">
    <div class="qk-transfer__header">
      <ChoiceFieldItem :value="`${id}-all`">
        <QuireCheckbox :label="text.selectAllSide(label)" :checked="checked"
          :disabled="disabled || enabled.length === 0" :required="false" :read-only="false"
          @update:checked="toggleAll">
          <span class="sr-only">{{ text.selectAll }}</span>{{ label }}
        </QuireCheckbox>
      </ChoiceFieldItem>
      <span class="qk-transfer__count">{{ selected.length }} / {{ visible.length }}</span>
    </div>
    <div v-if="searchable" class="qk-transfer__search">
      <QuireInput :id="`${id}-search`" v-model="query" width="100%" :disabled="disabled"
        :required="false" :read-only="false" :invalid="false"
        :aria-label="text.search(label)" :placeholder="text.searchPlaceholder" />
    </div>
    <QuireListbox v-model="selected" :items="visible" :label="label" hide-label selection-mode="multiple"
      :density="density" :disabled="disabled" class="qk-transfer__list" content-class="qk-transfer__content">
      <template v-if="$slots.item" #item="state"><slot name="item" v-bind="state" :side="side" /></template>
      <template #empty>{{ query.trim() && searchable ? text.noResults : text.empty }}</template>
    </QuireListbox>
    <p v-if="unavailable" class="qk-transfer__notice">{{ text.unavailable(unavailable) }}</p>
  </section>
</template>
