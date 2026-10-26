<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { QuireIcon, QuireIconButton } from "@quirekit/ui/vue";
import type { MindMapOverview } from "@quirekit/mind-map-simple";
import type { MindMapPoint } from "@quirekit/mind-map";
import type { MindEditorOverviewProps } from "./types";
import { useMindEditorMessages } from "../messages";
import "./styles.css";

const props = defineProps<MindEditorOverviewProps>();
const emit = defineEmits<{ /** Closes only this viewing consumer. */ close: []; /** Active-instance failure. */ error: [reason: unknown] }>();
const { t } = useMindEditorMessages();
const svg = ref<SVGSVGElement>(), overview = shallowRef<MindMapOverview>();
const viewBox = ref("0 0 1 1");
let frame = 0, pointer: number | undefined, latest: MindMapPoint | undefined;
const unavailable = computed(() => props.state.busy || props.state.composing);
watch([() => props.editor, () => props.state.geometryVersion, () => props.state.busy, () => props.state.composing, () => props.state.scale], () => {
  if (unavailable.value) return;
  try {
    overview.value = props.editor.getOverview(); const b = overview.value.bounds, s = props.state.scale;
    // Keep the pointer's inverse projection stable during panning. A new layout or
    // zoom includes the current viewport once, so an already fitted map still shows its frame.
    const left = Math.min(b.x - 40, -props.state.x / s), top = Math.min(b.y - 40, -props.state.y / s);
    const right = Math.max(b.x + b.width + 40, (overview.value.viewportWidth - props.state.x) / s);
    const bottom = Math.max(b.y + b.height + 40, (overview.value.viewportHeight - props.state.y) / s);
    viewBox.value = `${left} ${top} ${right - left} ${bottom - top}`;
  } catch (reason) { emit("error", reason); }
}, { immediate: true });
const silhouettes = computed(() => {
  const topics = overview.value?.topics ?? [];
  /** @param root - Main root versus other topics. @returns One SVG path with bounded DOM size. */
  function path(root: boolean): string {
    return topics.filter(topic => topic.root === root).map(topic => `M${topic.x} ${topic.y}h${topic.width}v${topic.height}h${-topic.width}Z`).join("");
  }
  return { root: path(true), other: path(false) };
});
const viewport = computed(() => ({ x: -props.state.x / props.state.scale, y: -props.state.y / props.state.scale,
  width: (overview.value?.viewportWidth ?? 0) / props.state.scale, height: (overview.value?.viewportHeight ?? 0) / props.state.scale }));

/** Publishes at most one world-coordinate navigation per animation frame. */
function flush(): void {
  cancelAnimationFrame(frame); frame = 0; const point = latest; latest = undefined;
  if (!point || unavailable.value) return;
  try { props.editor.panTo(point); } catch (reason) { emit("error", reason); }
}
/** @param event - Captured CSS-pixel pointer. */
function move(event: PointerEvent): void {
  if (pointer !== event.pointerId || unavailable.value) return;
  const matrix = svg.value?.getScreenCTM(); if (!matrix) return;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  latest = { x: point.x, y: point.y }; if (!frame) frame = requestAnimationFrame(flush);
}
/** @param event - Minimap-owned primary pointer, never a canvas selection. */
function start(event: PointerEvent): void {
  if (event.button !== 0 || unavailable.value) return;
  event.preventDefault(); pointer = event.pointerId; svg.value?.setPointerCapture(pointer); svg.value?.focus(); move(event);
}
/** @param event - Final pointer position before releasing capture. */
function end(event: PointerEvent): void {
  if (pointer !== event.pointerId) return;
  move(event); flush(); svg.value?.releasePointerCapture(pointer); pointer = undefined;
}
/** @param event - Local navigation keys; native IME always retains ownership. */
function key(event: KeyboardEvent): void {
  if (unavailable.value || event.isComposing || event.keyCode === 229) return;
  if (event.key === "Escape") { event.preventDefault(); emit("close"); return; }
  const directions: Record<string, readonly [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const direction = directions[event.key]; if (!direction) return;
  event.preventDefault(); const b = viewport.value;
  latest = { x: b.x + b.width / 2 + direction[0] * b.width / 10, y: b.y + b.height / 2 + direction[1] * b.height / 10 }; flush();
}
/** Cancels only unexecuted viewport work when this optional consumer closes. */
function cancel(): void { cancelAnimationFrame(frame); frame = 0; pointer = undefined; latest = undefined; }
onBeforeUnmount(cancel);
</script>

<template>
  <aside class="qk-mind-editor__overview" :aria-label="t('overview')" @mousedown.stop @click.stop @contextmenu.stop @keydown.stop>
    <header><strong>{{ t('overview') }}</strong><QuireIconButton :label="t('closeOverview')" variant="ghost" size="sm" @click="emit('close')"><QuireIcon name="close" /></QuireIconButton></header>
    <svg ref="svg" :viewBox="viewBox" tabindex="0" role="application" :aria-label="t('overviewHint')" :aria-disabled="unavailable"
      @pointerdown.stop="start" @pointermove.stop="move" @pointerup.stop="end" @pointercancel.stop="cancel" @keydown="key">
      <path :d="silhouettes.other" class="qk-mind-editor__overview-topics" />
      <path :d="silhouettes.root" class="qk-mind-editor__overview-root" />
      <rect v-bind="viewport" class="qk-mind-editor__overview-viewport" />
    </svg>
  </aside>
</template>
