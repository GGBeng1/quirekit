<script setup lang="ts">
import { computed, useId } from "vue";
import { flowchartImagePlacement, type FlowchartImage } from "@quirekit/flowchart";
const props = defineProps<{
  /** Unchanged original and local crop/fit draft. */ image: FlowchartImage;
  /** Current display frame, independent of intrinsic image dimensions. */ width: number;
  /** Current display frame height. */ height: number;
}>();
const id = `qk-flow-media-preview-${useId()}`, placement = computed(() => flowchartImagePlacement(props.image, props.width, props.height));
</script>
<template>
  <svg :viewBox="`0 0 ${width} ${height}`" role="img" :aria-label="image.alt">
    <defs><clipPath :id="id"><rect v-bind="placement.clip" /></clipPath></defs>
    <g :clip-path="`url(#${id})`"><image :href="image.dataUrl" :x="placement.x" :y="placement.y" :width="placement.width" :height="placement.height" preserveAspectRatio="none" /></g>
  </svg>
</template>
