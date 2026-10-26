<script setup lang="ts">
import type { QuireKitProseSlots } from "../types";
defineSlots<QuireKitProseSlots>();
</script>
<template>
  <dd class="qk-prose-node"><slot /></dd>
</template>
