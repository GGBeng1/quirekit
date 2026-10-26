<script setup lang="ts">
import Link from './link.vue';
import type { NavigationMenuSlots, QuireKitNavigationMenuItem, QuireKitNavigationMenuLink } from './types';
defineProps<{ items: readonly QuireKitNavigationMenuItem[]; currentKey?: string | undefined; disabled?: boolean | undefined; owner: string }>();
const emit = defineEmits<{ navigate: [item: QuireKitNavigationMenuLink, event: MouseEvent] }>();
defineSlots<NavigationMenuSlots>();
</script>
<template>
  <ul class="qk-navigation-menu__children">
    <li v-for="item in items" :key="item.key" class="qk-navigation-menu__child">
      <template v-if="item.children">
        <span class="qk-navigation-menu__group-label" :aria-disabled="disabled || item.disabled || undefined">{{ item.label }}</span>
        <PanelTree :items="item.children" :owner="owner" :current-key="currentKey" :disabled="disabled || item.disabled" @navigate="(entry, event) => emit('navigate', entry, event)">
          <template v-if="$slots.leading" #leading="context"><slot name="leading" v-bind="context" /></template>
          <template v-if="$slots.trailing" #trailing="context"><slot name="trailing" v-bind="context" /></template>
        </PanelTree>
      </template>
      <Link v-else :item="item" :owner="owner" horizontal :current-key="currentKey" :disabled="disabled" @navigate="(entry, event) => emit('navigate', entry, event)">
        <template v-if="$slots.leading" #leading="context"><slot name="leading" v-bind="context" /></template>
        <template v-if="$slots.trailing" #trailing="context"><slot name="trailing" v-bind="context" /></template>
      </Link>
    </li>
  </ul>
</template>
