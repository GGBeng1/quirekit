<script setup lang="ts">
import { useBlockLocale } from "../../localization/use-locale";
import { ref } from "vue";
import type { Editor } from "@quirekit/core";
import { QuireImagePreview, QuireIconButton, QuireIcon, useQuireKitLocale, type QuireKitImagePreviewToolbarOptions } from "@quirekit/ui/vue";
import type { BlockMediaGallery } from "./types";

const { t, localize } = useBlockLocale();

const props = defineProps<{
  /** Source owner, used only for the fallback focus target. */ editor: Editor;
  /** Ordered resources and the opening object. */ gallery: BlockMediaGallery;
}>();
const emit = defineEmits<{ close: [] }>();
const index = ref(props.gallery.index), locale = useQuireKitLocale();
const toolbar: QuireKitImagePreviewToolbarOptions = {
  layout: ["counter", "separator", "zoomOut", "scale", "zoomIn", "separator", "fit", "rotateLeft", "rotateRight", "actions"]
};
/** @returns The original object, or the surviving editor when that object was removed. */
function finalFocus(): HTMLElement | null {
  return props.gallery.origin.isConnected ? props.gallery.origin : props.editor.isDestroyed ? null : props.editor.view.dom;
}
/** Downloads the current original preview resource without altering the document. */
function download(): void {
  const item = props.gallery.items[index.value];
  if (!item) return;
  const link = props.gallery.origin.ownerDocument.createElement("a");
  link.href = item.src; link.download = item.title || "图片"; link.click();
}
</script>
<template>
  <QuireImagePreview open v-model:index="index" :items="localize(gallery.items)" :toolbar="toolbar" :lang="locale"
    :portal-target="gallery.origin.ownerDocument.body" :final-focus-el="finalFocus" @update:open="!$event && emit('close')">
    <template #actions>
      <QuireIconButton :label="t('下载图片')" variant="text" size="md" @click="download"><QuireIcon name="download" :size="20" /></QuireIconButton>
    </template>
  </QuireImagePreview>
</template>
