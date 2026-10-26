<script setup lang="ts">
import type { QuireKitProseSlots } from "../../types";
defineSlots<QuireKitProseSlots>();
</script>
<template>
  <cite class="qk-prose-node"><slot /></cite>
</template>
