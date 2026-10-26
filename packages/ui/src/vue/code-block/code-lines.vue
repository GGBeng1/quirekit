<script setup lang="ts">
import { computed } from "vue";
import type { QuireKitCodeBlockProps, QuireKitCodeBlockLineSlotProps } from "./types";
const props = defineProps<Pick<QuireKitCodeBlockProps,
  "code" | "lineNumbers" | "startLine" | "highlightedLines" | "addedLines" | "removedLines"
>>();
defineSlots<{ /** Optional trusted token spans for one source line. */
  line?: (props: QuireKitCodeBlockLineSlotProps) => unknown;
}>();
const lines = computed(() => {
  const start = Number.isFinite(props.startLine) ? Math.max(1, Math.trunc(props.startLine!)) : 1;
  const source = props.code.split(/\r\n|\r|\n/);
  // A terminating separator ends the last source line; it does not add a numbered blank line.
  if (source.length > 1 && source.at(-1) === "") source.pop();
  return source.map((text, index) => ({ text, number: start + index }));
});
</script>

<template>
  <code class="qk-code-block__lines">
    <span v-for="line in lines" :key="line.number" class="qk-code-block__line"
      :data-highlighted="highlightedLines?.includes(line.number) ? '' : undefined"
      :data-change="removedLines?.includes(line.number) ? 'removed' : addedLines?.includes(line.number) ? 'added' : undefined">
      <span v-if="lineNumbers" class="qk-code-block__number" aria-hidden="true">{{ line.number }}</span>
      <span v-if="addedLines?.length || removedLines?.length" class="qk-code-block__change" aria-hidden="true">{{ removedLines?.includes(line.number) ? '−' : addedLines?.includes(line.number) ? '+' : ' ' }}</span>
      <span class="qk-code-block__line-text"><slot name="line" v-bind="line">{{ line.text }}</slot></span>
    </span>
  </code>
</template>
