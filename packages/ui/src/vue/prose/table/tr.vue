<script setup lang="ts">
import type { QuireKitProseSlots } from "../types";
defineSlots<QuireKitProseSlots>();
</script>
<template>
  <tr class="qk-prose-node"><slot /></tr>
</template>
