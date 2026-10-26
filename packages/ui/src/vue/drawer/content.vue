<script setup lang="ts">
import DrawerContentFrame from "./content-frame.vue";
import type { DrawerContentProps as Props } from "./types";

/** Drawer Content 的固定内容区域。 */
interface Slots {
  /** 独立滚动的面板正文。 */
  readonly default: () => unknown;
  /** 标题区右侧的附加动作。 */
  readonly headerActions?: () => unknown;
  /** 固定在正文下方的操作区。 */
  readonly footer?: () => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  size: "medium",
  draggable: undefined,
  showGrabber: undefined,
  showBackdrop: true,
  portalTarget: "body",
  portalled: true,
  showClose: true
});
defineSlots<Slots>();

// The public Teleport wrapper has no attribute target; keep private frame hooks private.
defineOptions({ inheritAttrs: false });
</script>

<template>
  <DrawerContentFrame v-bind="props" :description="props.description ?? ''">
    <slot />
    <template v-if="$slots.headerActions" #headerActions><slot name="headerActions" /></template>
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </DrawerContentFrame>
</template>
