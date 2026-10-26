<script setup lang="ts">
import { computed, defineComponent, h, onUnmounted, useId, watch } from "vue";
import type { EditorState } from "@quirekit/cm-state";
import { QuireProse, quireRichProseComponents } from "@quirekit/ui/vue";
import { MarkdownStream } from "../parse/session";
import type { MarkdownReadingError } from "../types";
import type { QuireMarkdownProps } from "./types";
import { useMarkdownSource } from "./stream/source";
import { MarkdownRenderer } from "./cache/renderer";
import { sameReadingSnapshot } from "./rendering/snapshot";

const props = withDefaults(defineProps<QuireMarkdownProps>(), { locale: "zh-CN", status: "complete", ssr: "semantic", cache: true });
const emit = defineEmits<{ /** Reports a local source-preserving failure. */ error: [failure: MarkdownReadingError] }>();
const prefix = useId();
/** @param failure - A source-preserving parser or reader failure. */
function report(failure: MarkdownReadingError): void { emit("error", failure); }
const renderer = new MarkdownRenderer();
const { state, pending, generation } = useMarkdownSource(props, report, () => new MarkdownStream(props.options));
watch(generation, () => renderer.clear(), { flush: "sync" });
onUnmounted(() => renderer.clear());
// An advanced adapter may declare extra state-facet dependencies in renderNodeKey.
// Supply its current state; ordinary reading still coalesces selection-only snapshots.
const snapshot = computed<EditorState | undefined>(previous => !props.renderNode && previous && state.value && sameReadingSnapshot(previous, state.value) ? previous : state.value);
const nodes = computed(() => {
  // A new document identity also replaces VNodes when an advanced host supplies
  // the very same EditorState object for the new document.
  generation.value;
  if (!snapshot.value) { renderer.clear(); return h("pre", { style: { whiteSpace: "pre-wrap" } }, props.content ?? ""); }
  return renderer.render(snapshot.value, props.locale, prefix, report, {
  components: { ...quireRichProseComponents, ...props.components },
  ...(props.html !== undefined ? { html: props.html } : {}), ...(props.renderNode ? { renderNode: props.renderNode } : {}),
  ...(props.cache !== undefined ? { cache: props.cache } : {}), ...(props.renderNodeKey ? { renderNodeKey: props.renderNodeKey } : {}),
  });
});
const Content = defineComponent({ setup: () => () => nodes.value });
</script>
<template><QuireProse :key="generation" density="compact" :data-state="status" :aria-busy="pending || status === 'receiving'"><Content /></QuireProse></template>
