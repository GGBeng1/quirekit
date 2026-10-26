<script setup lang="ts">
import { ref } from 'vue';
import { useCascaderFlyout } from './use-flyout';

/** Geometric child surface; dismissal remains owned by the root Popover. */
interface Props {
  /** Parent option, resolved after its level mounts. */
  readonly anchor?: HTMLElement | undefined;
  /** Nesting order determines overlap on narrow viewports. */
  readonly level: number;
}
const props = defineProps<Props>();
const element = ref<HTMLElement>();
const ready = useCascaderFlyout(() => props.anchor, element);
</script>

<template>
  <div ref="element" class="qk-cascader__flyout" data-cascader-flyout :style="{ visibility: ready ? 'visible' : 'hidden', zIndex: level }">
    <slot />
  </div>
</template>
