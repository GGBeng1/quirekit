<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import { provideQuireOverlayHost } from "@quirekit/ui/vue";
import { useEditorUIOverlayHost } from "./context";
import { projectEditorUIAnchoredOverlayAnchor } from "./project";
import { useOverlayBoundaryPosition } from "./use-position";
import type { EditorUIAnchoredOverlayAnchor, EditorUIAnchoredOverlayPlacement } from "./types";

const props = defineProps<{
  /** Semantic visibility; scrolling does not revoke it. */ show: boolean;
  /** Complete target in client coordinates. */ anchor: EditorUIAnchoredOverlayAnchor | null;
  /** Preferred side around the semantic target. */ placement?: EditorUIAnchoredOverlayPlacement;
  /** Refreshes semantic geometry after a size change, never on scroll. */ resolveAnchor?: () => EditorUIAnchoredOverlayAnchor | null;
  /** Positions exact geometry without clamping, for rails and drag previews. */ unconstrained?: boolean;
  /** Semantic stacking role; menus and panels stay above resident document controls. */ layer?: "chrome" | "overlay";
}>();
const owner = useEditorUIOverlayHost();
const surface = ref<HTMLElement>();
const retained = shallowRef<EditorUIAnchoredOverlayAnchor>({ x: 0, y: 0 });
const available = ref(false);
const visible = computed(() => props.show && available.value && !!owner?.host.value && !!owner.viewport.value);
provideQuireOverlayHost({ target: () => owner?.host.value, strategy: "absolute" });
/** @param resolve - Whether a size invalidation requires fresh semantic geometry. Retains document-local geometry across scrolling. */
function refresh(resolve = false): void {
  const anchor = resolve && props.resolveAnchor ? props.resolveAnchor() : props.anchor;
  const host = owner?.host.value;
  available.value = !!anchor && !!host;
  if (anchor && host) retained.value = projectEditorUIAnchoredOverlayAnchor(anchor, host);
}
watch([() => props.anchor, () => props.show, () => owner?.host.value], () => refresh(), { immediate: true, flush: "sync" });
const positioned = useOverlayBoundaryPosition({
  root: () => owner!.viewport.value!, viewport: () => owner!.viewport.value!, host: () => owner?.host.value ?? null,
  surface: () => surface.value ?? null, anchor: () => retained.value, placement: () => props.placement ?? "bottom-start",
  visible: () => visible.value && !props.unconstrained, refreshAnchor: () => refresh(true)
});
const style = computed(() => props.unconstrained ? { position: "absolute" as const, left: `${retained.value.x}px`, top: `${retained.value.y}px`, pointerEvents: "auto" as const } : positioned.value);
</script>
<template>
  <Teleport v-if="visible" :to="owner!.host.value!">
    <div ref="surface" data-editor-anchored-overlay :style="[style, { width: 'max-content', zIndex: `var(--qk-layer-${layer ?? 'overlay'})` }]" @pointerdown.stop>
      <slot :portal-target="owner!.host.value!" />
    </div>
  </Teleport>
</template>
