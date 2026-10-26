<script setup lang="ts">
import { computed } from "vue";
import type { WordTableStylePreview } from "@quirekit/classic-table-model";

const props = defineProps<{ preview: WordTableStylePreview; label: string }>();
const cells = computed(() => props.preview.cells.map(cell => ({ ...cell, x: cell.column * 32, y: cell.row * 16 })));
</script>
<template>
  <svg viewBox="-2 -2 100 68" role="img" :aria-label="label" focusable="false" style="width:100%;height:100%">
    <g v-for="cell in cells" :key="`${cell.row}:${cell.column}`">
      <rect :x="cell.x" :y="cell.y" width="32" height="16" :fill="cell.fill ? 'var(--qk-color-surface-subtle)' : 'none'" />
      <path :d="`M${cell.x + 7} ${cell.y + 8}h18`" stroke="var(--qk-color-text-tertiary)" :stroke-width="cell.bold ? 2.5 : 1.25" stroke-linecap="round" />
      <template v-for="(border, edge) in cell.borders" :key="edge">
        <path v-if="border && border.style !== 'nil' && border.style !== 'none'"
          :d="edge === 'top' ? `M${cell.x} ${cell.y}h32` : edge === 'bottom' ? `M${cell.x} ${cell.y+16}h32` : edge === 'left' ? `M${cell.x} ${cell.y}v16` : `M${cell.x+32} ${cell.y}v16`"
          stroke="var(--qk-color-border-strong)" stroke-width="0.75" fill="none" />
      </template>
    </g>
  </svg>
</template>
