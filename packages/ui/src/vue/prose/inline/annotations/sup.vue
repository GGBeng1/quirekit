<script setup lang="ts">
import type { QuireKitProseSlots } from "../../types";
defineSlots<QuireKitProseSlots>();
</script>
<template>
  <sup class="qk-prose-node"><slot /></sup>
</template>
