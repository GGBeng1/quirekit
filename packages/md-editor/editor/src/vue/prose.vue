<script setup lang="ts">
import { computed, defineComponent, h, onUnmounted, useId, watch } from "vue";
import { MarkdownRenderer } from "@quirekit/incremark/vue";
import { QuireProse } from "@quirekit/ui/vue";
import { renderMdProse } from "../reading/render";
import type { MdProseProps } from "./types";
import type { EditorState } from "@quirekit/cm-state";
import type { MdReadingError } from "../reading/contributions/types";
import { sameReadingSnapshot } from "../reading/snapshot";
import { useProseSource } from "../reading/stream/vue";
const props = withDefaults(defineProps<MdProseProps>(), { locale: "zh-CN", status: "complete", cache: true });
const emit = defineEmits<{ /** A failed contribution retains its exact source. */ error: [failure: MdReadingError] }>();
const prefix = useId();
/** @param failure - A source-preserving parser or reader failure. */
function report(failure: MdReadingError): void { emit("error", failure); }
const renderer = new MarkdownRenderer();
const { state, pending, generation } = useProseSource(props, report);
watch(generation, () => renderer.clear(), { flush: "sync" });
onUnmounted(() => renderer.clear());
// Selection/focus changes are not reading inputs. Preserve both decoding and
// resource lifetimes until source, parse coverage or presentation actually changes.
const snapshot = computed<EditorState | undefined>(previous => previous && state.value && sameReadingSnapshot(previous, state.value) ? previous : state.value);
const nodes = computed(() => {
  generation.value;
  if (!snapshot.value) { renderer.clear(); return h("pre", { style: { whiteSpace: "pre-wrap" } }, props.content ?? ""); }
  return renderMdProse(snapshot.value, props.locale, prefix, report, {
  ...(props.components ? { components: props.components } : {}), ...(props.html !== undefined ? { html: props.html } : {}),
  ...(props.cache !== undefined ? { cache: props.cache } : {}),
  }, renderer);
});
const Content = defineComponent({ setup: () => () => nodes.value });
</script>
<template><QuireProse :key="generation" density="compact" :data-state="status" :aria-busy="pending || status === 'receiving'"><Content /></QuireProse></template>
