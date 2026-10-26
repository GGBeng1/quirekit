<script setup lang="ts">
import type { QuireKitProseSlots } from "../types";
defineSlots<QuireKitProseSlots>();
</script>
<template>
  <tbody class="qk-prose-node"><slot /></tbody>
</template>
