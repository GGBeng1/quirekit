<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { BlockDragSnapshot } from "./types";
const props = defineProps<{ snapshot: BlockDragSnapshot }>();
const host = ref<HTMLElement>();
onMounted(() => host.value?.append(props.snapshot.dom));
</script>
<template>
  <div ref="host" class="qk-block-drag-ghost" data-block-ghost aria-hidden="true" inert :style="{ width: `${snapshot.width}px`, height: `${snapshot.height}px` }" />
</template>
