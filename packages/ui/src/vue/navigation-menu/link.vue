<script setup lang="ts">
import { NavigationMenu } from '@ark-ui/vue/navigation-menu';
import { computed } from 'vue';
import EntryContent from './entry-content.vue';
import type { NavigationMenuSlots, QuireKitNavigationMenuLink } from './types';
const props = defineProps<{ item: QuireKitNavigationMenuLink; currentKey?: string | undefined; disabled?: boolean | undefined; horizontal?: boolean; owner?: string }>();
const emit = defineEmits<{ navigate: [item: QuireKitNavigationMenuLink, event: MouseEvent] }>();
defineSlots<NavigationMenuSlots>();
const available = computed(() => !!props.item.href && !props.disabled && !props.item.disabled);
/** @param event - Original activation, preserved for browser and host routing. */
function navigate(event: MouseEvent): void {
  if (available.value) emit('navigate', props.item, event);
}
</script>
<template>
  <component :is="available ? (horizontal ? NavigationMenu.Link : 'a') : 'span'"
    :href="available ? item.href : undefined" :target="available ? item.target : undefined"
    :rel="available ? (item.rel ?? (item.target === '_blank' ? 'noopener noreferrer' : undefined)) : undefined"
    v-bind="horizontal && available ? { current: item.key === currentKey, value: owner ?? item.key } : {}"
    :aria-current="item.key === currentKey ? 'page' : undefined" :aria-disabled="disabled || item.disabled || undefined"
    class="qk-navigation-menu__link" @click="navigate">
    <EntryContent :item="item" :current="item.key === currentKey">
      <template v-if="$slots.leading" #leading="context"><slot name="leading" v-bind="context" /></template>
      <template v-if="$slots.trailing" #trailing="context"><slot name="trailing" v-bind="context" /></template>
    </EntryContent>
  </component>
</template>
