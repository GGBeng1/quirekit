<script setup lang="ts">
/// <reference path="../styles.d.ts" />
import "katex/dist/katex.min.css";
import { onMounted, onBeforeUnmount, shallowRef, watch } from "vue";
import { TaskScope, type ComponentViewHandle } from "@quirekit/msfe-core";
import { createMathRenderer, createMermaidRenderer, createTextDiagramRenderer, type PreviewProps } from "@quirekit/msfe-markdown-extras";
const props = defineProps<{
  /** Confirmed semantic renderer. */ kind: PreviewProps["kind"];
  /** Exact original fallback, including delimiters. */ source: string;
  /** Explicit grammar of the fenced source. */ language?: PreviewProps["language"];
  /** Confirmed body without outer syntax. */ text: string;
}>();
const parent = shallowRef<HTMLElement>();
const scope = new TaskScope();
let handle: ComponentViewHandle<PreviewProps> | undefined;
/** @returns Read-only inputs sharing the safe MSFE renderer; there is no second editable view. */
function inputs(): PreviewProps {
  // Reading snapshots own local source coordinates and never create editor intents.
  return { kind: props.kind, source: props.source, text: props.text, ...(props.language ? { language: props.language } : {}), range: { from: 0, to: props.source.length }, readOnly: true, target: () => ({ reveal: () => false, release() {} }) };
}
/** Replace the rendering family when a newer reading snapshot changes a formula into a diagram. */
function mountRenderer(): void {
  handle?.destroy();
  const renderer = props.kind === "mermaid" ? createMermaidRenderer(undefined) : props.kind === "textDiagram" ? createTextDiagramRenderer(undefined) : createMathRenderer(undefined);
  handle = renderer({ dom: parent.value!, props: inputs(), scope, host: undefined, requestMeasure() {} });
}
onMounted(mountRenderer);
watch(() => [props.kind, props.source, props.text, props.language], (next, previous) => {
  if (!parent.value) return;
  if (next[0] !== previous[0]) mountRenderer();
  else handle?.update(inputs());
});
onBeforeUnmount(() => { handle?.destroy(); scope.dispose(); });
</script>
<template><span ref="parent" :class="['md-reading-preview', { 'md-reading-preview--block': kind !== 'inlineMath', 'qk-code-block qk-prose-source': ['mermaid', 'textDiagram'].includes(kind) }]" data-variant="soft" data-qk-not-prose /></template>
<style>
.md-reading-preview--block { display: block; overflow-x: auto; max-width: 100%; }
.md-reading-preview svg { max-width: 100%; height: auto; }
.md-reading-preview .msfe-preview-mermaid > svg, .md-reading-preview .msfe-preview-textDiagram > svg { display: block; margin-inline: auto; }
.md-reading-preview .msfe-preview[data-status='error'] { white-space: pre-wrap; font-family: var(--qk-font-code); }
</style>
