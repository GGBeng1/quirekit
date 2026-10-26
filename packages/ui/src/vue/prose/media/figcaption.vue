<script setup lang="ts">
import type { QuireKitProseSlots } from "../types";
defineSlots<QuireKitProseSlots>();
</script>
<template>
  <figcaption class="qk-prose-node"><slot /></figcaption>
</template>
