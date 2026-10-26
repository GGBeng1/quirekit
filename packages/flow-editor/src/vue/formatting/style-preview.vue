<script setup lang="ts">
import { relationMarkerPath } from "@quirekit/flowchart-x6";
import type { FlowchartArrow } from "@quirekit/flowchart";
import type { FlowStyleOption } from "../../ui/formatting/types";
defineProps<{
  /** Local SVG sample; it never reads canvas geometry. */ option: FlowStyleOption;
}>();
/** @param value - Marker facing left. @returns Original geometry shared with the canvas for relation endpoints. */
function path(value: FlowchartArrow): string {
  return relationMarkerPath(value) ?? ({ none: "", block: "M0 0 L8 -4 V4 Z", open: "M8 -4 L0 0 L8 4", diamond: "M0 0 L5 -4 L10 0 L5 4 Z", circle: "M0 0 a3.5 3.5 0 1 0 7 0 a3.5 3.5 0 1 0 -7 0" } as Record<string, string>)[value] ?? "";
}
</script>

<template>
  <svg class="qk-flow-style-preview" viewBox="0 0 80 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-linecap="round">
    <path :d="option.path" :stroke-width="option.width ?? 1.5" :stroke-dasharray="option.dashed ? '6 4' : undefined" />
    <g v-for="(marker, index) in [option.start, option.end]" :key="index" :transform="index ? 'translate(74 12) scale(-1 1)' : 'translate(6 12)'">
      <path v-if="marker" :d="path(marker)" :fill="['block', 'diamond', 'circle'].includes(marker) ? 'currentColor' : marker.endsWith('-hollow') ? 'var(--qk-color-surface-page)' : 'none'" stroke-width="1.2" />
      <circle v-if="marker?.startsWith('er-zero-')" cx="19" cy="0" r="3" fill="var(--qk-color-surface-page)" stroke-width="1.2" />
    </g>
  </svg>
</template>

<style scoped>
.qk-flow-style-preview { display: block; width: 80px; height: 24px; flex: none; }
</style>
