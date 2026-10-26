<script setup lang="ts">
import { computed } from "vue";
import { QuireButton, QuireSelect } from "@quirekit/ui/vue";
import type { ClassicEditorShellModel } from "../../types";
import { useClassicEditorOverlay } from "../../overlays/registry";

/** Reading controls use product UI state; they never issue document commands. */
interface Props {
  /** Mounted shell context and locale. */
  readonly model: ClassicEditorShellModel;
}
const props = defineProps<Props>();
const zoom = computed(() => props.model.context?.ui.state.zoom ?? 100);
const mode = computed(() => props.model.context?.ui.state.zoomMode ?? "manual");
const value = computed(() => mode.value === "manual" ? String(zoom.value) : mode.value);
const english = computed(() => (props.model.context?.locale ?? props.model.locale) === "en");
const label = computed(() => english.value ? "Zoom" : "缩放");
const items = computed(() => [
  { value: "fit-content", label: `${english.value ? "Fit text" : "适应正文"}${mode.value === "fit-content" ? ` · ${zoom.value}%` : ""}` },
  { value: "fit-width", label: `${english.value ? "Fit width" : "适应页宽"}${mode.value === "fit-width" ? ` · ${zoom.value}%` : ""}` },
  { value: "fit-page", label: `${english.value ? "Fit page" : "整页"}${mode.value === "fit-page" ? ` · ${zoom.value}%` : ""}` },
  ...[...new Set([25, 50, 60, 75, 100, 125, 150, 200, 300, 400, zoom.value])]
    .sort((a, b) => a - b).map(value => ({ value: String(value), label: `${value}%` }))
]);
const overlay = useClassicEditorOverlay("zoom-select", undefined, undefined, undefined, {
  dismissOnOutsidePointer: () => false, dismissOnEscape: () => false
});
/** @param value - Public select value, validated by the UI state controller. */
function select(value: string | undefined): void {
  if (value === "fit-width" || value === "fit-page" || value === "fit-content") props.model.context?.ui.setZoomMode(value);
  else if (value !== undefined) props.model.context?.ui.setZoom(Number(value));
  overlay.close();
}
</script>

<template>
  <div class="qk-classic-editor__zoom" role="group" :aria-label="label">
    <QuireButton variant="ghost" size="sm" :aria-label="english ? 'Zoom out' : '缩小'"
      :disabled="zoom <= 25" @pointerdown.prevent @click="model.context?.ui.setZoom(zoom - 10)">−</QuireButton>
    <QuireSelect v-bind="overlay.ownerAttributes" :model-value="value" :items="items" :label="label"
      size="sm" variant="text" :width="mode === 'manual' ? '80px' : '160px'" content-width="184px" placement="top-end" :open="overlay.isVisible()"
      :content-props="{ ...overlay.ownerAttributes, lang: model.context?.locale ?? model.locale }" @update:model-value="select"
      @update:open="overlay.setVisible($event === true)" />
    <QuireButton variant="ghost" size="sm" :aria-label="english ? 'Zoom in' : '放大'"
      :disabled="zoom >= 400" @pointerdown.prevent @click="model.context?.ui.setZoom(zoom + 10)">+</QuireButton>
  </div>
</template>
