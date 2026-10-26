<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { createQuireDrawingManipulationTrack, type QuireDrawingFrame, type QuireDrawingResizeHandle } from "@quirekit/view-engine";
import type { EditorUIObjectFrameProps, EditorUIObjectHandle } from "./types";
const props = defineProps<EditorUIObjectFrameProps>();
const emit = defineEmits<{ resize: [frame: QuireDrawingFrame]; preview: [frame: QuireDrawingFrame | null] }>();
const preview = ref<QuireDrawingFrame | null>(null);
const handles: readonly EditorUIObjectHandle[] = [
 { value: "north-west", x: 0, y: 0, cursor: "nwse-resize", label: "左上" }, { value: "north", x: .5, y: 0, cursor: "ns-resize", label: "上侧" },
 { value: "north-east", x: 1, y: 0, cursor: "nesw-resize", label: "右上" }, { value: "east", x: 1, y: .5, cursor: "ew-resize", label: "右侧" },
 { value: "south-east", x: 1, y: 1, cursor: "nwse-resize", label: "右下" }, { value: "south", x: .5, y: 1, cursor: "ns-resize", label: "下侧" },
 { value: "south-west", x: 0, y: 1, cursor: "nesw-resize", label: "左下" }, { value: "west", x: 0, y: .5, cursor: "ew-resize", label: "左侧" }
];
// Client frames are translated on scroll; refresh the offset parent with that same frame.
const origin = computed(() => { props.frame; return props.portalTarget?.getBoundingClientRect(); });
const current = computed(() => preview.value ?? props.frame);
let gesture: { element: HTMLElement; pointerId: number; point: { x: number; y: number }; handle: QuireDrawingResizeHandle; frame: QuireDrawingFrame } | null = null;
/** @param event - Pointer capture source. @param handle - Exact selected drawing handle. */
function start(event: PointerEvent, handle: QuireDrawingResizeHandle): void {
 if (event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) return;
 event.preventDefault(); event.stopPropagation(); cancel();
 gesture = { element: event.currentTarget, pointerId: event.pointerId, point: { x: event.clientX, y: event.clientY }, handle, frame: props.frame };
 gesture.element.setPointerCapture(event.pointerId);
 document.addEventListener("keydown", key, true); props.viewport.addEventListener("scroll", cancel, { passive: true }); window.addEventListener("resize", cancel);
}
/** @param event - Captured input; pointer movement never changes canonical content. */
function move(event: PointerEvent): void {
 if (!gesture || event.pointerId !== gesture.pointerId) return;
 const frame = createQuireDrawingManipulationTrack("resize", gesture.frame, gesture.point, { x: event.clientX, y: event.clientY }, gesture.handle,
  event.shiftKey ? props.lockAspectRatio === false : props.lockAspectRatio !== false,
  { minimumExtent: { width: 32, height: 24 }, maximumExtent: { width: props.maximumWidth, height: 4000 }, preserveOrigin: true, extentStep: 1 }).previewFrame;
 preview.value = frame; emit("preview", frame);
}
/** @param event - Release of the owning pointer. */
function finish(event: PointerEvent): void {
 if (!gesture || event.pointerId !== gesture.pointerId) return;
 move(event); const next = preview.value, previous = gesture.frame; cancel();
 if (next && (next.rect.width !== previous.rect.width || next.rect.height !== previous.rect.height)) emit("resize", next);
}
/** @param event - Escape revokes this preview without a transaction. */
function key(event: KeyboardEvent): void { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancel(); } }
/** Releases every transient resource after cancellation, target loss or commit. */
function cancel(): void {
 const old = gesture; gesture = null; preview.value = null; emit("preview", null);
 if (old?.element.hasPointerCapture(old.pointerId)) old.element.releasePointerCapture(old.pointerId);
 document.removeEventListener("keydown", key, true); props.viewport.removeEventListener("scroll", cancel); window.removeEventListener("resize", cancel);
}
watch(() => props.identity, cancel); onBeforeUnmount(cancel);
</script>
<template>
 <Teleport :to="portalTarget ?? viewport" :disabled="!portalTarget">
 <div data-editor-object-frame :style="{ position: portalTarget ? 'absolute' : 'fixed', zIndex: 25, pointerEvents: 'none', boxSizing: 'border-box', border: '2px solid var(--qk-color-action-primary, #505bff)', left: `${current.rect.x - (origin?.left ?? 0)}px`, top: `${current.rect.y - (origin?.top ?? 0)}px`, width: `${current.rect.width}px`, height: `${current.rect.height}px`, transform: `rotate(${current.rotation}deg)` }">
  <button v-for="handle in handles" :key="handle.value" type="button" :aria-label="`缩放图片${handle.label}`" :data-resize-handle="handle.value"
   :style="{ position: 'absolute', left: `${handle.x * 100}%`, top: `${handle.y * 100}%`, width: '9px', height: '9px', padding: 0, borderRadius: '50%', border: '2px solid var(--qk-color-action-primary, #505bff)', background: 'var(--qk-color-surface-page, white)', transform: 'translate(-50%, -50%)', pointerEvents: 'auto', touchAction: 'none', cursor: handle.cursor }"
   @pointerdown="start($event, handle.value)" @pointermove="move" @pointerup="finish" @pointercancel="cancel" @lostpointercapture="cancel" />
  <output v-if="preview" style="position: absolute; left: 0; top: 100%; margin-top: 8px; background: var(--qk-color-surface-page); color: var(--qk-color-text-primary); padding: 4px 8px; border: 1px solid var(--qk-color-border-subtle); white-space: nowrap">{{ Math.round(current.rect.width) }} × {{ Math.round(current.rect.height) }} px</output>
 </div>
 </Teleport>
</template>
