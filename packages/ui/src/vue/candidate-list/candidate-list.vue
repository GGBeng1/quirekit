<script setup lang="ts">
import type { QuireKitCandidateListProps } from '../../components/candidate-list';

const props = defineProps<QuireKitCandidateListProps>();
const emit = defineEmits<{
  /** Candidate activated while the owner keeps editor focus. */
  select: [key: string];
}>();

/** Activate one enabled candidate without changing the editor's selection.
 * @param key - Stable candidate identity.
 */
function select(key: string): void {
  if (!props.items.find(item => item.key === key && !item.disabled)) return;
  emit('select', key);
}
</script>

<template>
  <div :id="id" class="qk-candidate-list" role="listbox" :aria-label="label">
    <div v-for="(item, index) in items" :id="`${id}-item-${index}`" :key="item.key"
      class="qk-candidate-list__item" role="option" :aria-selected="item.key === activeKey"
      :aria-disabled="item.disabled || undefined" :data-active="item.key === activeKey || undefined"
      @pointerdown.prevent @click="select(item.key)">
      <span class="qk-candidate-list__label">{{ item.label }}</span>
      <span v-if="item.description" class="qk-candidate-list__description">{{ item.description }}</span>
    </div>
  </div>
</template>
