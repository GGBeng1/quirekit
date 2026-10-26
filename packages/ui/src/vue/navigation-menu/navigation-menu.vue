<script setup lang="ts">
import { LocaleProvider } from '@ark-ui/vue/locale';
import { NavigationMenu } from '@ark-ui/vue/navigation-menu';
import { computed, ref, watch } from 'vue';
import Link from './link.vue';
import EntryContent from './entry-content.vue';
import PanelTree from './panel-tree.vue';
import VerticalTree from './vertical-tree.vue';
import Collapsed from './collapsed.vue';
import PositionedContent from './positioned-content.vue';
import { guardHoverClick } from './interaction';
import { containsCurrent, normalizeExpansion, hasDescription } from './projection';
import { useQuireKitLocale, useQuireKitMessages } from '../locale-provider/context';
import type { NavigationMenuSlots, QuireKitNavigationMenuProps, QuireKitNavigationMenuLink } from './types';
const props = withDefaults(defineProps<QuireKitNavigationMenuProps>(), { orientation: 'horizontal', panelLayout: 'list', size: 'sm', density: 'regular', disabled: false, trigger: 'click', highlight: true, collapsed: false, tooltip: true, defaultValue: () => [] });
defineOptions({ inheritAttrs: false });
const locale = useQuireKitLocale();
const text = useQuireKitMessages('navigationMenu');
const label = computed(() => props.ariaLabel ?? text.value.label);
/** 展开分组的 key 数组，与当前路由分开控制。 */
const value = defineModel<string[]>('value');
const local = ref([...props.defaultValue]);
const emit = defineEmits<{ navigate: [item: QuireKitNavigationMenuLink, event: MouseEvent] }>();
defineSlots<NavigationMenuSlots>();
const expanded = computed(() => normalizeExpansion(props.items, value.value ?? local.value, props.orientation === 'vertical', props.disabled));
/** @param keys - Expansion identities produced by the owning Ark primitive. */
function update(keys: string[]): void { local.value = keys; value.value = keys; }
watch(() => props.trigger, () => { if (props.orientation === 'horizontal') update([]); });
watch(expanded, keys => {
  if (JSON.stringify(keys) !== JSON.stringify(value.value ?? local.value)) update(keys);
}, { immediate: true });
/** @param key - Vertical group identity. @param open - Ark disclosure's next state. */
function toggle(key: string, open: boolean): void {
  update(open ? [...expanded.value, key] : expanded.value.filter(value => value !== key));
}
/**
 * Completes an ordinary link activation even when the host handles routing.
 * @param item - Activated destination.
 * @param event - Original event retained for native or client-side routing.
 */
function navigate(item: QuireKitNavigationMenuLink, event: MouseEvent): void {
  if (props.orientation === 'horizontal' && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) update([]);
  emit('navigate', item, event);
}
</script>
<template>
  <LocaleProvider :locale="locale">
  <component :is="orientation === 'horizontal' ? NavigationMenu.Root : 'nav'" v-if="items.length" :aria-label="label"
    v-bind="{ ...$attrs, ...(orientation === 'horizontal' ? { value: expanded[0] ?? '', disableClickTrigger: false, disableHoverTrigger: trigger === 'click', disablePointerLeaveClose: trigger === 'click', translations: { rootLabel: label } } : {}) }"
    :class="['qk-navigation-menu', orientation === 'horizontal' && `qk-navigation-menu--${size}`, `qk-navigation-menu--${orientation}`, `qk-navigation-menu--density-${density}`, orientation === 'vertical' && collapsed && 'qk-navigation-menu--collapsed', !highlight && 'qk-navigation-menu--plain']"
    @update:value="(key: string) => update(key ? [key] : [])">
    <NavigationMenu.List v-if="orientation === 'horizontal'" as-child>
      <ul class="qk-navigation-menu__list">
      <NavigationMenu.Item v-for="item in items" :key="item.key" :value="item.key" :disabled="disabled || item.disabled || (item.children !== undefined && !item.children.length)" as-child>
        <li class="qk-navigation-menu__item">
        <template v-if="item.children">
          <NavigationMenu.Trigger @click.capture="guardHoverClick($event, trigger)" :disabled="disabled || item.disabled || !item.children.length" class="qk-navigation-menu__trigger" :data-current-parent="!disabled && !item.disabled && containsCurrent(item, currentKey) || undefined">
            <EntryContent :item="item">
              <template v-if="$slots.leading" #leading="context"><slot name="leading" v-bind="context" /></template>
              <template v-if="$slots.trailing" #trailing="context"><slot name="trailing" v-bind="context" /></template>
            </EntryContent>
            <span class="qk-navigation-menu__indicator"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></span>
          </NavigationMenu.Trigger>
          <PositionedContent :open="expanded[0] === item.key" :trigger="trigger" :grid="panelLayout === 'grid'" :rich="hasDescription(item.children)">
            <PanelTree :items="item.children" :owner="item.key" :current-key="currentKey" :disabled="disabled || item.disabled || (item.children !== undefined && !item.children.length)" @navigate="navigate">
              <template v-if="$slots.leading" #leading="context"><slot name="leading" v-bind="context" /></template>
              <template v-if="$slots.trailing" #trailing="context"><slot name="trailing" v-bind="context" /></template>
            </PanelTree>
          </PositionedContent>
        </template>
        <Link v-else :item="item" horizontal :current-key="currentKey" :disabled="disabled" @navigate="navigate">
          <template v-if="$slots.leading" #leading="context"><slot name="leading" v-bind="context" /></template>
          <template v-if="$slots.trailing" #trailing="context"><slot name="trailing" v-bind="context" /></template>
        </Link>
        </li>
      </NavigationMenu.Item>
      </ul>
    </NavigationMenu.List>
    <Collapsed v-else-if="collapsed" :items="items" :expanded="expanded" :current-key="currentKey" :disabled="disabled" :trigger="trigger" :tooltip="tooltip" :aria-label="label" @toggle="toggle" @navigate="(entry, event) => emit('navigate', entry, event)">
      <template v-if="$slots.leading" #leading="context"><slot name="leading" v-bind="context" /></template>
      <template v-if="$slots.trailing" #trailing="context"><slot name="trailing" v-bind="context" /></template>
    </Collapsed>
    <VerticalTree v-else :items="items" :expanded="expanded" :current-key="currentKey" :disabled="disabled" @toggle="toggle" @navigate="(entry, event) => emit('navigate', entry, event)">
      <template v-if="$slots.leading" #leading="context"><slot name="leading" v-bind="context" /></template>
      <template v-if="$slots.trailing" #trailing="context"><slot name="trailing" v-bind="context" /></template>
    </VerticalTree>
  </component>
  </LocaleProvider>
</template>
