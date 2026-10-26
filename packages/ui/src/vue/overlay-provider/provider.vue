<script setup lang="ts">
import { provideQuireOverlayHost } from "./context";
const props = defineProps<{
  /** Product-owned portal destination. */ target?: HTMLElement | undefined;
  /** Floating positioning contract. */ strategy?: "absolute" | "fixed" | undefined;
}>();
provideQuireOverlayHost({ target: () => props.target, get strategy() { return props.strategy; } });
</script>
<template><slot /></template>
