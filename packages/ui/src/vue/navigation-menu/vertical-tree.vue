<script setup lang="ts">
import { useLocaleContext, DEFAULT_LOCALE } from '@ark-ui/vue/locale';
import { Collapsible } from '@ark-ui/vue/collapsible';
import Link from './link.vue';
import EntryContent from './entry-content.vue';
import { containsCurrent } from './projection';
import type { NavigationMenuSlots, QuireKitNavigationMenuItem, QuireKitNavigationMenuLink } from './types';
defineProps<{ items: readonly QuireKitNavigationMenuItem[]; expanded: readonly string[]; currentKey?: string | undefined; disabled?: boolean }>();
const emit = defineEmits<{ toggle: [key: string, open: boolean]; navigate: [item: QuireKitNavigationMenuLink, event: MouseEvent] }>();
defineSlots<NavigationMenuSlots>();
const locale = useLocaleContext(DEFAULT_LOCALE);
</script>
<template>
  <ul class="qk-navigation-menu__vertical-list" :dir="locale.dir">
    <li v-for="item in items" :key="item.key" class="qk-navigation-menu__child">
      <Collapsible.Root v-if="item.children" :open="expanded.includes(item.key)" :disabled="disabled || item.disabled || (item.children !== undefined && !item.children.length)" @update:open="open => emit('toggle', item.key, open)">
        <Collapsible.Trigger class="qk-navigation-menu__trigger" :data-current-parent="!disabled && !item.disabled && containsCurrent(item, currentKey) || undefined">
          <EntryContent :item="item">
            <template v-if="$slots.leading" #leading="context"><slot name="leading" v-bind="context" /></template>
            <template v-if="$slots.trailing" #trailing="context"><slot name="trailing" v-bind="context" /></template>
          </EntryContent>
          <Collapsible.Indicator class="qk-navigation-menu__indicator"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></Collapsible.Indicator>
        </Collapsible.Trigger>
        <Collapsible.Content class="qk-navigation-menu__disclosure">
          <VerticalTree :items="item.children" :expanded="expanded" :current-key="currentKey" :disabled="disabled || item.disabled || (item.children !== undefined && !item.children.length)" @toggle="(key, open) => emit('toggle', key, open)" @navigate="(entry, event) => emit('navigate', entry, event)">
            <template v-if="$slots.leading" #leading="context"><slot name="leading" v-bind="context" /></template>
            <template v-if="$slots.trailing" #trailing="context"><slot name="trailing" v-bind="context" /></template>
          </VerticalTree>
        </Collapsible.Content>
      </Collapsible.Root>
      <Link v-else :item="item" :current-key="currentKey" :disabled="disabled" @navigate="(entry, event) => emit('navigate', entry, event)">
        <template v-if="$slots.leading" #leading="context"><slot name="leading" v-bind="context" /></template>
        <template v-if="$slots.trailing" #trailing="context"><slot name="trailing" v-bind="context" /></template>
      </Link>
    </li>
  </ul>
</template>
