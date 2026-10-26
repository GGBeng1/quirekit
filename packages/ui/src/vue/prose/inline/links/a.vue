<script setup lang="ts">
import type { QuireKitProseAProps, QuireKitProseSlots } from "../../types";
defineProps<QuireKitProseAProps>();
defineSlots<QuireKitProseSlots>();
</script>
<template>
  <a :href="href" :target="target" :rel="rel" class="qk-prose-node"><slot /></a>
</template>
