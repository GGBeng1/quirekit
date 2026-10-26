<script setup lang="ts">
import { onBeforeUnmount, shallowRef, watch } from "vue";
const emit = defineEmits<{
  /** Physical target available only for this mounted editor. */ target: [element: HTMLElement | undefined];
}>();
const target = shallowRef<HTMLElement>();
watch(target, value => emit("target", value), { flush: "post" });
onBeforeUnmount(() => emit("target", undefined));
</script>
<template>
  <div class="md-overlay-host" data-md-editor-overlay data-qk-not-prose>
    <div ref="target" class="md-overlay-target"><slot /></div>
  </div>
</template>
<style scoped>
/* No containing transform or layout box: clients keep viewport CSS coordinates. */
.md-overlay-host { position: fixed; inset: 0; pointer-events: none; z-index: var(--qk-layer-overlay); }
.md-overlay-target { display: contents; pointer-events: auto; }
</style>
