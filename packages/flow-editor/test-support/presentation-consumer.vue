<script setup lang="ts">
import { QuireLocaleProvider } from "@quirekit/ui/vue";
import { QuireFlowEditor } from "@quirekit/flow-editor/vue";
import type { FlowchartDocument, FlowchartPlaybackTrace } from "@quirekit/flowchart";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";

defineProps<{
  /** Canonical source accepted by the public component. */ document: FlowchartDocument;
  /** Host-owned, session-only sequence. */ playback: FlowchartPlaybackTrace;
}>();
defineEmits<{ ready: [editor: FlowchartEditor] }>();
</script>
<template>
  <QuireLocaleProvider locale="en"><QuireFlowEditor :document="document" :playback="playback" mode="presentation" @ready="$emit('ready', $event)" /></QuireLocaleProvider>
</template>
