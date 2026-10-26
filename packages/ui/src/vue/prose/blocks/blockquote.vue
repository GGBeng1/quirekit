<script setup lang="ts">
import type { QuireKitProseSlots } from "../types";
defineSlots<QuireKitProseSlots>();
</script>
<template>
  <blockquote class="qk-prose-node"><slot /></blockquote>
</template>
