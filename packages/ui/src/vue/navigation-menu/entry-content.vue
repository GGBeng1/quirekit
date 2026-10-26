<script setup lang="ts">
import type { NavigationMenuSlots, QuireKitNavigationMenuItem } from './types';
defineProps<{ item: QuireKitNavigationMenuItem; current?: boolean }>();
defineSlots<NavigationMenuSlots>();
</script>
<template>
  <span v-if="$slots.leading" class="qk-navigation-menu__adornment"><slot name="leading" :item="item" :current="!!current" /></span>
  <span class="qk-navigation-menu__copy"><span>{{ item.label }}</span><span v-if="item.description" class="qk-navigation-menu__description">{{ item.description }}</span></span>
  <span v-if="$slots.trailing" class="qk-navigation-menu__adornment"><slot name="trailing" :item="item" :current="!!current" /></span>
</template>
