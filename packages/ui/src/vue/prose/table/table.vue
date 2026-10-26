<script setup lang="ts">
import type { QuireKitProseSlots } from "../types";
// The frame owns scrolling and keyboard focus; native attributes stay on the table.
defineOptions({ inheritAttrs: false });
defineSlots<QuireKitProseSlots>();
</script>
<template>
  <div class="qk-prose-table" tabindex="0"><table v-bind="$attrs" class="qk-prose-node"><slot /></table></div>
</template>
