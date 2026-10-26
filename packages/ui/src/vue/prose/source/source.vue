<script setup lang="ts">
import { computed } from "vue";
import { QuireCodeBlock } from "../../code-block";
import { definedProseProps } from "../shared/props";
import type { QuireKitClipboardErrorDetails } from "../../../components/clipboard";
import type { QuireKitProseSourceProps, QuireKitProseSourceSlots } from "./types";
// An omitted Vue Boolean otherwise becomes false and suppresses the child defaults.
const props = withDefaults(defineProps<QuireKitProseSourceProps>(), {
  presentation: "document",
  header: undefined, copy: undefined, lineNumbers: undefined, wrap: undefined,
  collapsible: undefined, collapsed: undefined, defaultCollapsed: undefined
});
defineOptions({ inheritAttrs: false });
defineSlots<QuireKitProseSourceSlots>();
const emit = defineEmits<{
  /** 请求变更折叠状态。 */
  "update:collapsed": [value: boolean];
  /** 原文已复制到系统剪贴板。 */
  copy: [];
  /** 复制失败，保留 CodeBlock 的重试反馈。 */
  copyError: [details: QuireKitClipboardErrorDetails];
}>();
const options = computed(() => {
  const { code, language, filename, highlights, meta: _meta, presentation, ...rest } = props;
  const embedded = presentation === "embedded";
  return {
    ...definedProseProps(rest),
    code: code ?? "",
    ...(language == null ? {} : { language }),
    ...(filename == null ? {} : { filename }),
    header: props.header ?? !embedded,
    collapsible: props.collapsible ?? true,
    defaultCollapsed: props.defaultCollapsed ?? true,
    variant: props.variant ?? (embedded ? "plain" : "soft"),
    density: props.density ?? (embedded ? "compact" : "regular"),
    highlightedLines: props.highlightedLines ?? highlights ?? []
  };
});
const context = computed(() => ({ code: props.code ?? "", language: props.language ?? undefined, filename: props.filename ?? undefined, highlights: props.highlights, meta: props.meta ?? undefined }));
</script>
<template>
  <QuireCodeBlock v-bind="{ ...options, ...$attrs }" class="qk-prose-source" :class="{ 'qk-prose-source--embedded': presentation === 'embedded' }"
    @update:collapsed="emit('update:collapsed', $event)" @copy="emit('copy')" @copy-error="emit('copyError', $event)">
    <template v-if="$slots.code || $slots.default" #code><slot name="code" v-bind="context"><slot v-bind="context" /></slot></template>
    <template v-if="$slots.title" #title><slot name="title" /></template>
    <template v-if="$slots.actions" #actions="actions"><slot name="actions" v-bind="actions" /></template>
    <template v-if="$slots.navigation" #navigation="navigation"><slot name="navigation" v-bind="navigation" /></template>
    <template v-if="$slots.line" #line="line"><slot name="line" v-bind="line" /></template>
  </QuireCodeBlock>
</template>
