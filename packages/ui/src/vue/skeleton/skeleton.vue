<script setup lang="ts">
/** Decorative geometry that can be replaced by loaded content. */
interface Props {
  /** Whether to display the placeholder instead of the slot. */
  readonly loading?: boolean;
  /** Expected content width; defaults to the available width. */
  readonly width?: string;
  /** Expected content height; defaults to one body line. */
  readonly height?: string;
  /** Circle for avatars, rectangle for text or content. */
  readonly shape?: "rectangle" | "circle";
  /** Optional gentle pulse, automatically disabled for reduced motion. */
  readonly animated?: boolean;
}
withDefaults(defineProps<Props>(), { loading: true, width: "100%", height: "var(--qk-skeleton-line-height)", shape: "rectangle", animated: true });
defineSlots<{
  /** Real content, mounted after loading finishes. */
  default?: () => unknown;
}>();
</script>
<template>
  <span v-if="loading" aria-hidden="true" :class="['qk-skeleton', `qk-skeleton--${shape}`, { 'qk-skeleton--animated': animated }]" :style="{ width: shape === 'circle' ? height : width, height }" />
  <slot v-else />
</template>
