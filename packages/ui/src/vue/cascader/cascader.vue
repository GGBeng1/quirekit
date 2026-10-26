<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { QuireKitCascaderProps } from './types';
import type { HierarchyPickerEmits } from '../hierarchy-picker/types';
import { searchHierarchy } from '../hierarchy-picker/data';
import { useHierarchyPicker } from '../hierarchy-picker/use-picker';
import PickerField from '../hierarchy-picker/field.vue';
import QuireListbox from '../listbox/listbox.vue';
import CascaderPanels from './panels.vue';
import { useQuireKitMessages } from '../locale-provider/context';

const props = withDefaults(defineProps<QuireKitCascaderProps>(), { open: undefined, searchable: true, clearable: true, portalled: true, expandTrigger: 'hover' });
const emit = defineEmits<HierarchyPickerEmits>();
const text = useQuireKitMessages('hierarchyPicker');
const { value, nodes, entries, open, query, setOpen, commit, reset } = useHierarchyPicker(props,
  next => { emit('update:modelValue', next); emit('valueChange', next); },
  next => { emit('update:open', next); emit('openChange', next); });
const browsing = ref<string[]>([]);
const display = computed(() => value.value.map(id => entries.value.find(entry => entry.node.id === id)?.node.label ?? id).join(' / '));
const results = computed(() => searchHierarchy(entries.value.filter(entry => entry.leaf), query.value)
  .map(entry => ({ value: entry.node.id, label: entry.text, disabled: entry.node.disabled === true })));
watch([open, value], () => { if (open.value) browsing.value = [...value.value]; }, { immediate: true });
/** @param id - Terminal candidate selected through browsing or path search. */
function choose(id: string): void {
  const entry = entries.value.find(entry => entry.node.id === id);
  if (!entry?.leaf || entry.node.disabled) return;
  commit(entry.path.map(node => node.id));
  setOpen(false);
}
</script>

<template>
  <PickerField v-bind="props" :value="value" :display="display" :open="open" :query="query" flyouts
    @update:query="query = $event" @update:open="setOpen" @clear="commit([])" @reset="reset">
    <div v-if="query.trim()" class="qk-hierarchy-picker__viewport">
      <QuireListbox :label="text.searchResults(label)" hide-label :items="results" :model-value="value.slice(-1)"
        @update:model-value="$event?.[0] && choose($event[0])"><template #empty>{{ text.noMatches }}</template></QuireListbox>
    </div>
    <CascaderPanels v-else-if="open" v-model="browsing" :nodes="nodes" :label="label"
      :selected="value.at(-1)" :expand-trigger="expandTrigger" @choose="choose" />
  </PickerField>
</template>
