<script setup lang="ts">
import { computed } from "vue";
import type { EditorListPreviewLine } from "./types";
const props = defineProps<{
  /** Resolved marker samples, independent of document geometry. */
  readonly lines: readonly EditorListPreviewLine[];
  /** Accessible thumbnail name. */
  readonly label: string;
}>();
// Reserve the longest marker's label width so compound numbering never touches the sample text.
const textStart = computed(() => Math.max(32, ...props.lines.map(line => line.marker.length * 7 + 6)));
</script>
<template>
  <svg viewBox="0 0 120 90" width="100%" height="100%" role="img" :aria-label="label" focusable="false">
    <g v-for="(line, index) in lines" :key="index" :transform="`translate(${12 + line.depth * 8}, ${22 + index * 22})`">
      <text y="4" fill="currentColor" font-size="14">{{ line.marker }}</text>
      <path :d="`M ${textStart} 0 H ${92 - line.depth * 8}`" stroke="var(--qk-color-border-strong)" stroke-width="2" stroke-linecap="round" />
    </g>
  </svg>
</template>
