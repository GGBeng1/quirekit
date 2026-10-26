<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import QuireIcon from "../icon/icon.vue";
import QuireIconButton from "../button/icon-button.vue";
import { resolveFloatingPanelLayout } from "./geometry";
import type { QuireKitFloatingPanelPosition, QuireKitFloatingPanelProps, QuireKitFloatingPanelRect } from "./types";

defineOptions({ inheritAttrs: false });
const props = defineProps<QuireKitFloatingPanelProps>();
const emit = defineEmits<{ close: [] }>();
const card = ref<HTMLElement>();
const boundary = shallowRef<QuireKitFloatingPanelRect>({ x: 0, y: 0, width: 0, height: 0 });
const height = ref(0);
const position = shallowRef<QuireKitFloatingPanelPosition | null>(null);
const layout = computed(() => resolveFloatingPanelLayout(boundary.value, height.value, position.value));
const style = computed(() => ({ width: `${layout.value.width}px`, maxHeight: `${layout.value.maxHeight}px`,
  transform: `translate(${layout.value.x}px, ${layout.value.y}px)` }));
let drag: { id: number; header: HTMLElement; x: number; y: number; origin: QuireKitFloatingPanelPosition } | undefined;

/** Measures only the product viewport and this card; document scrolling never invalidates this frame. */
function measure(): void {
  const root = props.root, viewport = props.viewport ?? root;
  const parent = root.getBoundingClientRect(), rect = viewport.getBoundingClientRect();
  boundary.value = {
    x: rect.left + viewport.clientLeft - parent.left - root.clientLeft + root.scrollLeft,
    y: rect.top + viewport.clientTop - parent.top - root.clientTop + root.scrollTop,
    width: viewport.clientWidth, height: viewport.clientHeight
  };
  height.value = card.value?.offsetHeight ?? 0;
}

/** Releases pointer capture on completion, cancellation, close or unmount. */
function endDrag(): void {
  const active = drag;
  drag = undefined;
  if (active?.header.hasPointerCapture(active.id)) active.header.releasePointerCapture(active.id);
}

/** @param event - Primary pointer press on the title, excluding the close button. */
function startDrag(event: PointerEvent): void {
  if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
  event.preventDefault();
  const header = event.currentTarget as HTMLElement;
  endDrag();
  measure();
  drag = { id: event.pointerId, header, x: event.clientX, y: event.clientY, origin: layout.value };
  header.setPointerCapture(event.pointerId);
}

/** @param event - Captured title drag; only transient UI coordinates change. */
function moveDrag(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.id) return;
  position.value = resolveFloatingPanelLayout(boundary.value, height.value, {
    x: drag.origin.x + event.clientX - drag.x, y: drag.origin.y + event.clientY - drag.y
  });
}

/** @param event - Panel-local keyboard event; embedded composition retains ownership. */
function keydown(event: KeyboardEvent): void {
  if (event.key !== "Escape" || event.isComposing || event.defaultPrevented) return;
  event.preventDefault(); event.stopPropagation(); emit("close");
}

watch([() => props.open, () => props.root, () => props.viewport, card], (_value, _previous, cleanup) => {
  if (!props.open) return;
  measure();
  // Viewport resizing includes outline/ribbon changes. Content resizing clamps
  // the frame without subscribing to editor transactions or document scroll.
  const observer = new ResizeObserver(measure);
  for (const element of new Set([props.root, props.viewport, card.value])) if (element) observer.observe(element);
  cleanup(() => { observer.disconnect(); endDrag(); });
}, { immediate: true, flush: "post" });
</script>

<template>
  <Teleport :to="root">
    <section v-if="open" ref="card" v-bind="$attrs" class="qk-floating-panel" role="dialog"
      aria-modal="false" :aria-label="title" :style="style" @keydown="keydown" @pointerdown.stop>
      <header class="qk-floating-panel__header" @pointerdown="startDrag" @pointermove="moveDrag"
        @pointerup="endDrag" @pointercancel="endDrag" @lostpointercapture="endDrag">
        <h2 class="qk-floating-panel__title">{{ title }}</h2>
        <QuireIconButton size="sm" :label="closeLabel" :title="closeLabel" @click="emit('close')">
          <QuireIcon name="close" :size="16" />
        </QuireIconButton>
      </header>
      <slot />
    </section>
  </Teleport>
</template>

