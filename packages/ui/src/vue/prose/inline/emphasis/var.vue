<script setup lang="ts">
import type { QuireKitProseSlots } from "../../types";
defineSlots<QuireKitProseSlots>();
</script>
<template>
  <var class="qk-prose-node"><slot /></var>
</template>
