<script setup lang="ts">
import { onBeforeUnmount, shallowRef, watch } from "vue";
const emit = defineEmits<{
  /** Physical layer available only for this mounted editor. */ target: [element: HTMLElement | undefined];
}>();
const target = shallowRef<HTMLElement>();
watch(target, value => emit("target", value), { flush: "post" });
onBeforeUnmount(() => emit("target", undefined));
</script>
<template>
  <div ref="target" class="md-document-layer" data-md-document-layer data-qk-not-prose><slot v-if="target" /></div>
</template>
<style scoped>
/* Same box as the editor and inside its scroll flow: children use layer-local px and move
   with the document natively. Below sticky chrome so scrolled-away controls pass under it. */
.md-document-layer { position: absolute; inset: 0; z-index: calc(var(--qk-layer-chrome) - 1); pointer-events: none; }
</style>
