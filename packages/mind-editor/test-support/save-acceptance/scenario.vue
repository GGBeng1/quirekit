<script setup lang="ts">
import { ref } from "vue";
import { QuireLocaleProvider } from "@quirekit/ui/vue";
import { QuireMindEditor, type MindEditorHandle } from "@quirekit/mind-editor/vue";
import type { SaveAcceptanceProps } from "./types";

defineProps<SaveAcceptanceProps>();
const emit = defineEmits<{ ready: [handle: MindEditorHandle]; error: [error: unknown] }>();
const workspace = ref<MindEditorHandle>();
/** Publishes the initialized component's public reference. */
function ready(): void { if (workspace.value) emit("ready", workspace.value); }
</script>

<template>
  <QuireLocaleProvider locale="zh-CN">
    <QuireMindEditor ref="workspace" :document="source" title="保存起点" :recovery="recovery"
      @ready="ready" @error="emit('error', $event)" />
  </QuireLocaleProvider>
</template>
