<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef } from "vue";
import type { Editor } from "@quirekit/core";
import { startEditorBlockMarquee, type EditorBlockMarqueePreview } from "@quirekit/editor-ui";
import { EditorUIAnchoredOverlay } from "@quirekit/editor-ui/vue";

const props = defineProps<{ editor: Editor; viewport: HTMLElement }>();
const preview = shallowRef<EditorBlockMarqueePreview | null>(null);
let cancel: (() => void) | null = null;
/** @param event - Scrollport capture; shared admission excludes document text and controls. */
function press(event: PointerEvent): void {
  const next = startEditorBlockMarquee(props.editor, props.viewport, event, value => {
    preview.value = value;
    // Finished gestures must release the captured document and pointer event.
    if (value === null) cancel = null;
  });
  if (next) cancel = next;
}
onMounted(() => props.viewport.addEventListener("pointerdown", press, true));
onBeforeUnmount(() => { cancel?.(); props.viewport.removeEventListener("pointerdown", press, true); });
</script>

<template>
  <EditorUIAnchoredOverlay :show="!!preview" :anchor="preview?.rect ?? null" unconstrained layer="chrome">
    <div v-if="preview" data-block-marquee :data-block-count="preview.count" aria-hidden="true"
      class="qk-block-marquee" :style="{ width: `${preview.rect.width}px`, height: `${preview.rect.height}px` }" />
  </EditorUIAnchoredOverlay>
</template>
