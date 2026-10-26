<script setup lang="ts">
import AnchorList from './list.vue';
import { useAnchor } from './use-anchor';
import { useQuireKitMessages } from '../locale-provider/context';
import type { QuireKitAnchorItem, QuireKitAnchorProps } from './types';
const props = withDefaults(defineProps<QuireKitAnchorProps>(), { offset: 16, behavior: 'smooth', history: 'push' });
const emit = defineEmits<{
  /** Geometry-derived location changed; empty means no visible targets. */
  change: [id: string];
  /** Native link activation; preventDefault cancels component navigation. */
  navigate: [item: QuireKitAnchorItem, event: MouseEvent];
}>();
const text = useQuireKitMessages('anchor');
const { activeId, navigate: activate } = useAnchor(props, id => emit('change', id));
/** @param item - Activated location. @param event - Native click offered to the consumer first. */
function navigate(item: QuireKitAnchorItem, event: MouseEvent): void {
  emit('navigate', item, event);
  activate(item, event);
}
</script>
<template>
  <nav v-if="items.length" class="qk-anchor" :aria-label="ariaLabel ?? title ?? text.label">
    <p v-if="title" class="qk-anchor__title">{{ title }}</p>
    <AnchorList :items="items" :active-id="activeId" @navigate="navigate" />
  </nav>
</template>
