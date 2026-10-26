<script setup lang="ts">
import type { QuireKitProseSlots } from "../../types";
defineSlots<QuireKitProseSlots>();
</script>
<template>
  <strong class="qk-prose-node"><slot /></strong>
</template>
