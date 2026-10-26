<script setup lang="ts">
import { Combobox, createListCollection, useCombobox, type UseComboboxProps } from '@ark-ui/vue/combobox';
import { computed, ref, watch } from 'vue';
import QuireIcon from '../icon/icon.vue';
import QuireIconButton from '../button/icon-button.vue';
import QuireButton from '../button/button.vue';
import QuireKbd from '../kbd/kbd.vue';
import QuireEmptyState from '../empty-state/empty-state.vue';
import { filterCommandGroups } from './projection';
import { useQuireKitMessages } from '../locale-provider/context';
import type { CommandPaletteSlots, QuireKitCommandPaletteProps, QuireKitCommandPaletteItem } from './types';
const props = withDefaults(defineProps<QuireKitCommandPaletteProps>(), {
  defaultSearch: '', size: 'sm', density: 'regular', filter: 'local', loading: false, busy: false, disabled: false,
  errorText: '', autoFocus: false
});
const text = useQuireKitMessages('commandPalette');
const emit = defineEmits<{ 'update:search': [search: string]; select: [item: QuireKitCommandPaletteItem]; retry: []; escape: [event: KeyboardEvent] }>();
defineSlots<CommandPaletteSlots>();
const root = ref<HTMLElement>();
const local = ref(props.defaultSearch);
const composing = ref(false);
const query = computed(() => props.search ?? local.value);
const groups = computed(() => filterCommandGroups(props.groups, query.value, props.filter === 'local'));
const blocked = computed(() => props.disabled || props.loading || props.busy || !!props.errorText);
const collection = computed(() => createListCollection({
  items: groups.value.flatMap(group => group.items),
  itemToValue: item => item.key, itemToString: item => item.label,
  isItemDisabled: item => blocked.value || !!item.disabled
}));
const highlighted = ref('');
// Reconcile changed results without executing a command or replacing the input node.
watch(collection, next => {
  const item = next.find(highlighted.value);
  if (!item || next.getItemDisabled(item)) highlighted.value = '';
});
// Root 5.39.1 declares select but omits its callback bridge; the public hook preserves it.
const emptySelection: string[] = [];
const combobox = useCombobox(computed<UseComboboxProps<QuireKitCommandPaletteItem>>(() => ({
  collection: collection.value, modelValue: emptySelection, inputValue: query.value,
  highlightedValue: highlighted.value, open: true, disableLayer: true,
  disabled: props.disabled, autoFocus: props.autoFocus, closeOnSelect: false, loopFocus: true,
  selectionBehavior: 'preserve' as const, inputBehavior: 'autohighlight' as const,
  onInputValueChange: details => updateSearch(details.inputValue),
  onHighlightChange: details => { highlighted.value = details.highlightedValue ?? ''; },
  onSelect: select
})));
/** @returns The owned input, for Dialog initial focus. */
function getInputElement(): HTMLInputElement | null { return root.value?.querySelector('input') ?? null; }
/** Focuses the search field without changing its query. */
function focus(): void { getInputElement()?.focus(); }
/** @param search - Ark's latest visible input text. */
function updateSearch(search: string): void { local.value = search; emit('update:search', search); }
/** @param details - Each Ark activation, even when its value repeats. */
function select(details: { itemValue: string }): void {
  const item = collection.value.find(details.itemValue);
  if (item && !blocked.value && !item.disabled && !composing.value) emit('select', item);
}
/** @param event - Escape belongs to the host task, not a second popup layer. */
function escape(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || event.isComposing || event.keyCode === 229 || composing.value) return;
  event.preventDefault(); event.stopPropagation(); emit('escape', event);
}
/** Clears text through the public model and preserves input focus. */
function clear(): void { updateSearch(''); focus(); }
defineExpose({ focus, getInputElement });
</script>
<template>
  <section ref="root" :class="['qk-command-palette', `qk-command-palette--density-${density}`]" @keydown.capture="escape">
    <Combobox.RootProvider :value="combobox" class="qk-command-palette__root">
      <Combobox.Label class="sr-only">{{ label }}</Combobox.Label>
      <Combobox.Control :class="['qk-input', `qk-input--${size}`, disabled && 'qk-input--disabled', 'qk-command-palette__control']">
        <span class="qk-input__adornment" aria-hidden="true"><QuireIcon name="search" :size="16" /></span>
        <Combobox.Input class="qk-input__field" :placeholder="placeholder ?? text.placeholder" @compositionstart="composing = true" @compositionend="composing = false" />
        <QuireIconButton v-if="query" :label="text.clear" size="xs" :disabled="disabled" @pointerdown.prevent @click="clear"><QuireIcon name="close" :size="16" /></QuireIconButton>
      </Combobox.Control>
      <div class="qk-command-palette__viewport" :aria-busy="loading || busy || undefined">
        <div v-if="loading" class="qk-command-palette__state" role="status">{{ text.loading }}</div>
        <div v-else-if="errorText" class="qk-command-palette__state">
          <p role="alert" class="qk-command-palette__error">{{ errorText }}</p>
          <QuireButton :size="size" :disabled="disabled" @click="emit('retry')">{{ text.retry }}</QuireButton>
        </div>
        <Combobox.Content class="qk-command-palette__results" v-show="!loading && !errorText && groups.length">
          <Combobox.ItemGroup v-for="group in groups" :key="group.key" class="qk-command-palette__group">
            <Combobox.ItemGroupLabel class="qk-command-palette__group-label">{{ group.label }}</Combobox.ItemGroupLabel>
            <Combobox.Item v-for="item in group.items" :key="item.key" :item="item" class="qk-command-palette__item">
              <span v-if="$slots.leading" class="qk-command-palette__adornment" aria-hidden="true"><slot name="leading" :item="item" /></span>
              <span class="qk-command-palette__copy">
                <Combobox.ItemText>{{ item.label }}</Combobox.ItemText>
                <span v-if="item.description" class="qk-command-palette__description">{{ item.description }}</span>
                <span v-if="item.disabled && item.disabledReason" class="qk-command-palette__description">{{ item.disabledReason }}</span>
              </span>
              <span v-if="$slots.trailing || item.keys?.length" class="qk-command-palette__trailing">
                <slot name="trailing" :item="item"><QuireKbd v-if="item.keys?.length" :keys="item.keys" :size="density === 'compact' ? 'xs' : 'sm'" /></slot>
              </span>
            </Combobox.Item>
          </Combobox.ItemGroup>
        </Combobox.Content>
        <div v-if="!loading && !errorText && !groups.length" class="qk-command-palette__state"><QuireEmptyState size="sm" :title="text.empty" :description="text.emptyHint" /></div>
      </div>
    </Combobox.RootProvider>
    <p v-if="busy" role="status" class="qk-command-palette__status">{{ text.busy }}</p>
    <footer v-if="$slots.footer" class="qk-command-palette__footer"><slot name="footer" /></footer>
  </section>
</template>
