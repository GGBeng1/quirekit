<script setup lang="ts">
import { NavigationMenu } from '@ark-ui/vue/navigation-menu';
import { computed, ref, watch } from 'vue';
import { QuireTooltipRoot, QuireTooltipTrigger, QuireTooltipContent } from '../tooltip';
import Link from './link.vue';
import VerticalTree from './vertical-tree.vue';
import PositionedContent from './positioned-content.vue';
import { containsCurrent, normalizeExpansion } from './projection';
import { guardHoverClick } from './interaction';
import type { NavigationMenuSlots, QuireKitNavigationMenuItem, QuireKitNavigationMenuLink } from './types';

const props = defineProps<{ items: readonly QuireKitNavigationMenuItem[]; expanded: readonly string[]; currentKey?: string | undefined; disabled: boolean; trigger: 'click' | 'hover'; tooltip: boolean }>();
const emit = defineEmits<{ toggle: [key: string, open: boolean]; navigate: [item: QuireKitNavigationMenuLink, event: MouseEvent] }>();
defineSlots<NavigationMenuSlots>();
const opened = ref('');
const valid = computed(() => normalizeExpansion(props.items, [opened.value], false, props.disabled)[0] ?? '');
watch(valid, value => { opened.value = value; });
watch(() => props.trigger, () => { opened.value = ''; });
/** @param item - Native destination. @param event - Original host-routing event. */
function navigate(item: QuireKitNavigationMenuLink, event: MouseEvent): void {
  opened.value = '';
  emit('navigate', item, event);
}
</script>

<template>
  <NavigationMenu.Root as-child :value="valid" orientation="vertical" :disable-hover-trigger="trigger === 'click'" :disable-pointer-leave-close="trigger === 'click'" @update:value="opened = $event">
    <div>
      <NavigationMenu.List as-child>
        <ul class="qk-navigation-menu__vertical-list">
          <NavigationMenu.Item v-for="item in items" :key="item.key" :value="item.key" :disabled="disabled || item.disabled" as-child>
            <li class="qk-navigation-menu__item">
              <QuireTooltipRoot :disabled="!tooltip || valid === item.key" placement="right" :open-delay="300">
                <QuireTooltipTrigger as-child>
                  <span class="inline-flex">
                  <NavigationMenu.Trigger v-if="item.children" :disabled="disabled || item.disabled || !item.children.length" :aria-label="item.label" class="qk-navigation-menu__trigger qk-navigation-menu__rail-button" :data-current-parent="!disabled && !item.disabled && containsCurrent(item, currentKey) || undefined" @click.capture="guardHoverClick($event, trigger)">
                    <span class="qk-navigation-menu__adornment" aria-hidden="true"><slot name="leading" :item="item" :current="false">{{ item.label.slice(0, 1) }}</slot></span>
                    <span class="sr-only">{{ item.label }}</span>
                  </NavigationMenu.Trigger>
                  <Link v-else :item="item" :current-key="currentKey" :disabled="disabled" horizontal class="qk-navigation-menu__rail-button" @navigate="navigate">
                    <template #leading="context"><span aria-hidden="true"><slot name="leading" v-bind="context">{{ item.label.slice(0, 1) }}</slot></span></template>
                  </Link>
                  </span>
                </QuireTooltipTrigger>
                <QuireTooltipContent :content="item.label" :show-arrow="false" />
              </QuireTooltipRoot>
              <PositionedContent side v-if="item.children" :open="valid === item.key" :trigger="trigger">
                <span class="qk-navigation-menu__group-label">{{ item.label }}</span>
                <VerticalTree :items="item.children" :expanded="expanded" :current-key="currentKey" :disabled="disabled || !!item.disabled" @toggle="(key, open) => emit('toggle', key, open)" @navigate="navigate">
                  <template v-if="$slots.leading" #leading="context"><slot name="leading" v-bind="context" /></template>
                  <template v-if="$slots.trailing" #trailing="context"><slot name="trailing" v-bind="context" /></template>
                </VerticalTree>
              </PositionedContent>
            </li>
          </NavigationMenu.Item>
        </ul>
      </NavigationMenu.List>
    </div>
  </NavigationMenu.Root>
</template>
