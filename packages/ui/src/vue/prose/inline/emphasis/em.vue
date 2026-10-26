<script setup lang="ts">
import type { QuireKitProseSlots } from "../../types";
defineSlots<QuireKitProseSlots>();
</script>
<template>
  <em class="qk-prose-node"><slot /></em>
</template>
