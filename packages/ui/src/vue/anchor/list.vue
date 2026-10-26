<script setup lang="ts">
defineOptions({ name: 'AnchorList' });
import type { QuireKitAnchorItem } from './types';
defineProps<{
  /** Ordered descendants at this level. */
  items: readonly QuireKitAnchorItem[];
  /** Single geometry-derived current location. */
  activeId: string;
}>();
const emit = defineEmits<{ navigate: [item: QuireKitAnchorItem, event: MouseEvent] }>();
/** @param item - Activated location. @param event - Original native event passed through all levels. */
function navigate(item: QuireKitAnchorItem, event: MouseEvent): void { emit('navigate', item, event); }
</script>
<template>
  <ol class="qk-anchor__list">
    <li v-for="item in items" :key="item.id" class="qk-anchor__item">
      <a :href="`#${encodeURIComponent(item.id)}`" class="qk-anchor__link" :class="{ 'qk-anchor__link--current': activeId === item.id }"
        :aria-current="activeId === item.id ? 'location' : undefined" @click="navigate(item, $event)">{{ item.label }}</a>
      <div v-if="item.children?.length" class="qk-anchor__children">
        <list :items="item.children" :active-id="activeId" @navigate="navigate" />
      </div>
    </li>
  </ol>
</template>
