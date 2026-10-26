<script setup lang="ts">
import type { QuireKitBreadcrumbSlotProps, QuireKitBreadcrumbItem } from './types';
const props = defineProps<QuireKitBreadcrumbSlotProps>();
const emit = defineEmits<{ navigate: [item: QuireKitBreadcrumbItem, event: MouseEvent] }>();
defineSlots<{
  /** Static content inside the native link or text node. */
  default?: (props: QuireKitBreadcrumbSlotProps) => unknown;
  /** Static leading content. */
  leading?: (props: QuireKitBreadcrumbSlotProps) => unknown;
  /** Static trailing content. */
  trailing?: (props: QuireKitBreadcrumbSlotProps) => unknown;
}>();
/** @param event - Native click retained for host router interception. */
function navigate(event: MouseEvent): void {
  if (props.item.href && !props.item.disabled) emit('navigate', props.item, event);
}
</script>
<template>
  <component :is="item.href && !item.disabled ? 'a' : 'span'" class="qk-breadcrumb__link"
    :href="item.href && !item.disabled ? item.href : undefined" :target="item.href && !item.disabled ? item.target : undefined"
    :rel="item.href && !item.disabled ? item.rel ?? (item.target === '_blank' ? 'noopener noreferrer' : undefined) : undefined"
    :aria-current="current ? 'page' : undefined" :aria-disabled="item.disabled || undefined" @click="navigate">
    <slot v-bind="props">
      <span v-if="$slots.leading" class="qk-breadcrumb__adornment"><slot name="leading" v-bind="props" /></span>
      <span class="qk-breadcrumb__label">{{ item.label }}</span>
      <span v-if="$slots.trailing" class="qk-breadcrumb__adornment"><slot name="trailing" v-bind="props" /></span>
    </slot>
  </component>
</template>
