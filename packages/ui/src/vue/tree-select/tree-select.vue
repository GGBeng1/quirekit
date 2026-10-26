<script setup lang="ts">
import { computed, ref } from 'vue';
import type { QuireKitTreeSelectProps } from './types';
import type { HierarchyPickerEmits } from '../hierarchy-picker/types';
import { protectSelection, searchHierarchy } from '../hierarchy-picker/data';
import { useHierarchyPicker } from '../hierarchy-picker/use-picker';
import PickerField from '../hierarchy-picker/field.vue';
import QuireTreeView from '../tree-view/tree-view.vue';
import QuireListbox from '../listbox/listbox.vue';
import { useQuireKitMessages } from '../locale-provider/context';

const pickerText = useQuireKitMessages('hierarchyPicker');
const text = useQuireKitMessages('treeSelect');
const props = withDefaults(defineProps<QuireKitTreeSelectProps>(), { selectionMode: 'single', leafOnly: false, open: undefined, searchable: true, clearable: true, portalled: true });
const emit = defineEmits<HierarchyPickerEmits & {
  /** Expansion changes independently from selected ids. */
  'update:expandedValue': [value: string[]];
}>();
const { value, nodes, entries, open, query, setOpen, commit, reset } = useHierarchyPicker(props,
  next => { emit('update:modelValue', next); emit('valueChange', next); },
  next => { emit('update:open', next); emit('openChange', next); });
const localExpanded = ref([...(props.defaultExpandedValue ?? [])]);
const expanded = computed(() => props.expandedValue ?? localExpanded.value);
const multiple = computed(() => props.selectionMode === 'multiple');
const candidates = computed(() => entries.value.filter(entry => !(props.leafOnly || multiple.value) || entry.leaf));
const results = computed(() => searchHierarchy(candidates.value, query.value).map(entry => ({ value: entry.node.id, label: entry.text, disabled: entry.node.disabled === true })));
const display = computed(() => value.value.map(id => entries.value.find(entry => entry.node.id === id)?.node.label ?? id).join(text.value.separator));
/** @param next - Requested independent expansion model. */
function expand(next: string[] | undefined): void {
  localExpanded.value = next ?? [];
  emit('update:expandedValue', localExpanded.value);
}
/** @param next - Selection from the unfiltered tree or path-search list. */
function select(next: string[] | undefined): void {
  if (next === undefined) return;
  if (multiple.value) {
    commit(protectSelection(next, value.value, candidates.value));
  } else {
    const id = next[0];
    if (!id || !candidates.value.some(entry => entry.node.id === id && !entry.node.disabled)) return;
    commit([id]);
    setOpen(false);
  }
}
</script>

<template>
  <PickerField v-bind="props" :value="value" :display="display" :open="open" :query="query"
    @update:query="query = $event" @update:open="setOpen" @clear="commit([])" @reset="reset">
    <div class="qk-hierarchy-picker__viewport">
      <QuireListbox v-if="query.trim()" :label="pickerText.searchResults(label)" hide-label :items="results" :model-value="value"
        :selection-mode="selectionMode" @update:model-value="select"><template #empty>{{ pickerText.noMatches }}</template></QuireListbox>
      <QuireTreeView v-else-if="nodes.length" :label="label" :nodes="nodes" :checkable="multiple"
        :checked-value="value" :selected-value="multiple ? [] : value" :expanded-value="expanded"
        :expand-on-click="multiple || leafOnly" :show-indent-guides="false"
        @update:checked-value="select" @update:selected-value="!multiple && select($event)" @update:expanded-value="expand" />
      <p v-else class="qk-hierarchy-picker__empty">{{ pickerText.empty }}</p>
    </div>
  </PickerField>
</template>
