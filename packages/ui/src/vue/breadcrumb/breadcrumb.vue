<script setup lang="ts">
import { computed, ref, watch, type ComponentPublicInstance } from 'vue';
import { QuireIconButton } from '../button';
import { QuirePopoverRoot, QuirePopoverTrigger, QuirePopoverContent, QuirePopoverTitle, QuirePopoverCloseTrigger } from '../popover';
import Crumb from './crumb.vue';
import { projectBreadcrumb } from './projection';
import { useQuireKitMessages } from '../locale-provider/context';
import type { QuireKitBreadcrumbProps, QuireKitBreadcrumbSlotProps, QuireKitBreadcrumbItem } from './types';
const props = defineProps<QuireKitBreadcrumbProps>();
const text = useQuireKitMessages('breadcrumb');
const emit = defineEmits<{ navigate: [item: QuireKitBreadcrumbItem, event: MouseEvent] }>();
defineSlots<{
  /** Static item content; does not replace native link semantics. */
  item?: (props: QuireKitBreadcrumbSlotProps) => unknown;
  /** Static icon or context preceding the label. */
  leading?: (props: QuireKitBreadcrumbSlotProps) => unknown;
  /** Static metadata following the label. */
  trailing?: (props: QuireKitBreadcrumbSlotProps) => unknown;
  /** Decorative separator; hidden from assistive technology. */
  separator?: () => unknown;
}>();
const projection = computed(() => projectBreadcrumb(props.items.length, props.maxItems));
const open = ref(false);
const surface = ref<HTMLElement | null>(null);
watch(() => [props.items, props.maxItems], () => { open.value = false; }, { deep: true });
/** @param element - The one overflow surface inside the projected item loop. */
function setSurface(element: Element | ComponentPublicInstance | null): void {
  surface.value = element instanceof HTMLElement ? element : null;
}
/** @returns First available hidden ancestor, or the close button for a static-only path. */
function initialFocus(): HTMLElement | null {
  return surface.value?.querySelector<HTMLElement>('a[href]') ?? surface.value?.querySelector<HTMLElement>('button') ?? null;
}
/**
 * Closes the old path surface while leaving browser navigation under host control.
 * @param item - Activated original location.
 * @param event - Native click, including modifier keys and default prevention.
 */
function navigate(item: QuireKitBreadcrumbItem, event: MouseEvent): void {
  open.value = false;
  emit('navigate', item, event);
}
</script>
<template>
  <nav v-if="items.length" class="qk-breadcrumb" :aria-label="ariaLabel ?? text.label">
    <ol class="qk-breadcrumb__list">
      <li v-for="(index, position) in projection.visible" :key="index === null ? 'overflow' : `item:${items[index]!.key}`" class="qk-breadcrumb__item">
        <span v-if="position" class="qk-breadcrumb__separator" aria-hidden="true">
          <slot name="separator"><svg class="qk-breadcrumb__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6" /></svg></slot>
        </span>
        <QuirePopoverRoot v-if="index === null" v-model:open="open" :initial-focus-el="initialFocus">
          <QuirePopoverTrigger as-child><QuireIconButton :label="text.overflow" size="xs"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg></QuireIconButton></QuirePopoverTrigger>
          <QuirePopoverContent :show-arrow="false" class="qk-breadcrumb__popover">
            <div :ref="setSurface" class="qk-breadcrumb__surface">
              <div class="qk-breadcrumb__header"><QuirePopoverTitle>{{ text.overflow }}</QuirePopoverTitle><QuirePopoverCloseTrigger :label="text.closeOverflow" /></div>
              <ol class="qk-breadcrumb__hidden-list">
                <li v-for="hiddenIndex in projection.hidden" :key="items[hiddenIndex]!.key" class="qk-breadcrumb__hidden-item">
                  <Crumb :item="items[hiddenIndex]!" :index="hiddenIndex" :current="false" @navigate="navigate">
                    <template v-if="$slots.item" #default="context"><slot name="item" v-bind="context" /></template>
                    <template v-if="$slots.leading" #leading="context"><slot name="leading" v-bind="context" /></template>
                    <template v-if="$slots.trailing" #trailing="context"><slot name="trailing" v-bind="context" /></template>
                  </Crumb>
                </li>
              </ol>
            </div>
          </QuirePopoverContent>
        </QuirePopoverRoot>
        <Crumb v-else :item="items[index]!" :index="index" :current="index === items.length - 1" @navigate="navigate">
          <template v-if="$slots.item" #default="context"><slot name="item" v-bind="context" /></template>
          <template v-if="$slots.leading" #leading="context"><slot name="leading" v-bind="context" /></template>
          <template v-if="$slots.trailing" #trailing="context"><slot name="trailing" v-bind="context" /></template>
        </Crumb>
      </li>
    </ol>
  </nav>
</template>
