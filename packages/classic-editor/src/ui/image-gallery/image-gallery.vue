<script setup lang="ts">
import {
  QuireIcon,
  QuireIconButton,
  QuireImagePreview,
  type QuireKitImagePreviewToolbarOptions
} from "@quirekit/ui/vue";
import { computed, ref, shallowRef, watch } from "vue";
import { useClassicEditorOverlay } from "../../shell/overlays/registry";
import type { ClassicEditorImageGalleryProps, ClassicEditorImageGallerySlots } from "./types";

const props = withDefaults(defineProps<ClassicEditorImageGalleryProps>(), {
  overlayFamily: "image-gallery"
});
const previewToolbar = Object.freeze({
  layout: Object.freeze([
    "counter",
    "separator",
    "zoomOut",
    "scale",
    "zoomIn",
    "separator",
    "fit",
    "rotateLeft",
    "rotateRight",
    "actions"
  ] as const)
}) satisfies QuireKitImagePreviewToolbarOptions;
defineSlots<ClassicEditorImageGallerySlots>();
const emit = defineEmits<{
  /** Updates consumer-owned gallery visibility. */
  "update:show": [show: boolean];
  /** Updates the consumer-owned active item index. */
  "update:activeIndex": [activeIndex: number];
}>();
const visibility = ref(false);
const opener = shallowRef<HTMLElement | null>(null);
const overlay = useClassicEditorOverlay(
  props.overlayFamily, visibility, props.themeRoot.ownerDocument,
  { resolveRoot: () => props.themeRoot },
  { dismissOnEscape: () => false, dismissOnOutsidePointer: () => false }
);
const previewItems = computed(() => props.items.map(item => ({
  id: item.id,
  src: item.status === "ready" ? item.url ?? "" : "",
  alt: item.altText,
  title: item.label,
  ...(item.background === undefined ? {} : { background: item.background })
})));
watch(visibility, show => {
  if (show !== props.show) emit("update:show", show);
}, { flush: "sync" });
watch(() => props.show, show => {
  if (show && !visibility.value) {
    const active = props.themeRoot.ownerDocument.activeElement;
    opener.value = isOwnedHtmlElement(active, props.themeRoot.ownerDocument)
      ? active
      : null;
  }
  overlay.setVisible(show);
}, { immediate: true, flush: "sync" });

/** @returns Connected opener or the owning editor's focus entry point. */
function finalFocusEl(): HTMLElement | null {
  return opener.value?.isConnected ? opener.value : props.themeRoot;
}

/**
 * Checks one opener without relying on the global realm constructor.
 *
 * @param value - Candidate active element.
 * @param ownerDocument - Document that must own the candidate.
 * @returns Whether the candidate is an HTML element from the owning document.
 */
function isOwnedHtmlElement(
  value: Element | null,
  ownerDocument: Document
): value is HTMLElement {
  return value !== null
    && value.ownerDocument === ownerDocument
    && typeof (value as HTMLElement).focus === "function";
}

/** Downloads the current resolved resource without changing the document. */
function download(): void {
  const item = props.items[props.activeIndex];
  if (item?.status !== "ready" || !item.url) return;
  const link = props.themeRoot.ownerDocument.createElement("a");
  link.href = item.url;
  link.download = item.label;
  link.click();
}

/** @param show - Public preview visibility request. */
function updateVisibility(show: boolean): void { overlay.setVisible(show); }
</script>

<template>
  <QuireImagePreview
    :open="visibility"
    :toolbar="previewToolbar"
    :items="previewItems"
    :index="activeIndex"
    :final-focus-el="finalFocusEl"
    :portal-target="themeRoot.ownerDocument.body"
    :lang="lang"
    v-bind="overlay.ownerAttributes"
    @update:open="updateVisibility"
    @update:index="emit('update:activeIndex', $event)"
  >
    <template #actions="{ index }">
      <QuireIconButton :label="labels.download" variant="text" size="md" :disabled="items[index]?.status !== 'ready'" @click="download"><QuireIcon name="download" :size="20" /></QuireIconButton>
      <slot name="actions" :item="items[index] ?? null" :active-index="index" />
    </template>
  </QuireImagePreview>
</template>
