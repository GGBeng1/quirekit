<script setup lang="ts">
import { computed } from 'vue';
import type { QuireKitTreeNode } from '../../components/tree-view';
import QuireListbox from '../listbox/listbox.vue';
import QuireIcon from '../icon/icon.vue';
import { useQuireKitMessages } from '../locale-provider/context';

/** One independently scrollable hierarchy level. */
interface Props {
  /** Field accessible name. */
  readonly label: string;
  /** Zero-based depth. */
  readonly level: number;
  /** Siblings displayed by this level. */
  readonly nodes: readonly QuireKitTreeNode[];
  /** Current branch being browsed. */
  readonly active?: string | undefined;
  /** Committed terminal id, independent of hover. */
  readonly selected?: string | undefined;
}
const props = defineProps<Props>();
const text = useQuireKitMessages('cascader');
const emit = defineEmits<{
  /** A pointer is resting on an enabled option; never a commit. */
  hover: [id: string];
  /** Pointer enters this level, cancelling a pending sibling switch. */
  enter: [];
  /** Pointer leaves this level. */
  leave: [];
  /** Click or keyboard activation owned by Listbox. */
  select: [id: string];
  /** Cross-level keyboard navigation. */
  navigate: [event: KeyboardEvent];
}>();
// Only an expanded branch is provisionally selected in the navigation list.
// A hovered leaf must remain activatable; the checkmark uses the committed id.
const activeBranch = computed(() => props.nodes.find(node => node.id === props.active && node.children?.length)?.id);
const items = computed(() => props.nodes.map(node => ({ value: node.id, label: node.label, disabled: node.disabled === true })));
/** Delegates pointer intent without changing Listbox's active-descendant ownership.
 * @param event - Pointer movement inside this level's options.
 */
function hover(event: PointerEvent): void {
  if (event.pointerType === 'touch') return;
  const option = (event.target as HTMLElement).closest<HTMLElement>('[role="option"]');
  if (option?.dataset.value && option.getAttribute('aria-disabled') !== 'true') emit('hover', option.dataset.value);
}
</script>

<template>
  <div class="qk-cascader__level" :data-cascader-level="level" @pointermove="hover"
    @pointerenter="emit('enter')" @pointerleave="emit('leave')" @keydown.capture="emit('navigate', $event)">
    <QuireListbox :label="text.level(label, level + 1)" hide-label :items="items" :model-value="activeBranch ? [activeBranch] : []"
      @update:model-value="$event?.[0] && emit('select', $event[0])">
      <template #item="{ item }">
        <span class="qk-hierarchy-picker__option">{{ item.label }}</span>
        <QuireIcon v-if="nodes.some(node => node.id === item.value && (node.children?.length || node.childrenCount))"
          name="chevronRight" :size="12" class="qk-hierarchy-picker__next" />
        <QuireIcon v-else-if="selected === item.value" name="check" :size="12" />
      </template>
    </QuireListbox>
  </div>
</template>
