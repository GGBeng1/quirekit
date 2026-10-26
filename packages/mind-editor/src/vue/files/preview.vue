<script setup lang="ts">
import { useMindEditorMessages } from "../messages";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { MindEditorTemplatePreviewProps } from "./types";
const { t, failure } = useMindEditorMessages();
const props = defineProps<MindEditorTemplatePreviewProps>();
const target = ref<HTMLElement>(), visible = ref(false), source = ref(""), error = ref("");
let observer: IntersectionObserver | undefined;
onMounted(() => {
  observer = new IntersectionObserver(([entry]) => { visible.value = entry?.isIntersecting ?? false; });
  if (target.value) observer.observe(target.value);
});
onBeforeUnmount(() => observer?.disconnect());
watch([() => props.document, () => props.theme, visible], async ([document, theme, shown], previous, cleanup) => {
  if (previous[0] !== document || previous[1] !== theme) { source.value = ""; error.value = ""; }
  if (!shown || source.value) return;
  const controller = new AbortController(); cleanup(() => controller.abort());
  error.value = "";
  try {
    const image = await props.renderer.render(document, theme, controller.signal, props.priority);
    if (!controller.signal.aborted) source.value = image;
  } catch (reason) { if (!controller.signal.aborted) error.value = failure(reason); }
}, { flush: "post" });
</script>

<template>
  <span ref="target" class="qk-mind-editor__template-preview" :aria-busy="!source && !error">
    <img v-if="source" :src="source" :alt="t('fullPreview', { title: document.root.text })" draggable="false" />
    <span v-else class="qk-mind-editor__preview-placeholder" :title="error">{{ error ? t('previewUnavailable') : t('previewLoading') }}</span>
  </span>
</template>
