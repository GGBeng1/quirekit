<script setup lang="ts">
import type { QuireKitProsePreProps } from "../types";
const props = defineProps<QuireKitProsePreProps>();
defineSlots<{
  /** Renderer-produced code, including optional syntax tokens. Metadata is available to custom content. */
  default?: (props: QuireKitProsePreProps) => unknown;
}>();
</script>
<template>
  <pre class="qk-prose-node" tabindex="0" :aria-label="filename || language || 'Code'"><slot v-bind="props"><code>{{ code ?? '' }}</code></slot></pre>
</template>
