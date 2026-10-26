<script setup lang="ts">
import type { QuireKitProseHeadingProps, QuireKitProseSlots } from "../types";
withDefaults(defineProps<QuireKitProseHeadingProps>(), { anchor: true });
defineSlots<QuireKitProseSlots>();
</script>
<template>
  <h1 :id="id" class="qk-prose-node"><a v-if="id && anchor" :href="`#${encodeURIComponent(id)}`"><slot /></a><slot v-else /></h1>
</template>
