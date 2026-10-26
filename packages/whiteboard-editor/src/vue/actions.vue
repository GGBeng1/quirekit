<script setup lang="ts">
import { computed } from "vue";
import { createTheme, quireIconRegistry, type QuireKitToolbarEntry, type QuireKitToolbarExecuteEvent } from "@quirekit/ui";
import { QuireIconProvider, QuireThemeProvider, QuireToolbar } from "@quirekit/ui/vue";
import type { WhiteboardPreviewActions } from "@quirekit/whiteboard";
import { useWhiteboardMessages } from "./messages";
import { downloadWhiteboardPreview } from "../ui/preview";

const props = defineProps<{ /** Current exact target facts. */ actions: WhiteboardPreviewActions; /** Owning window. */ ownerDocument: Document; /** Host palette. */ dark: boolean }>();
const { text } = useWhiteboardMessages();
const theme = computed(() => createTheme({ scheme: props.dark ? "dark" : "light" }));
const items = computed<readonly QuireKitToolbarEntry[]>(() => [
  { value: "edit", text: text.value.edit, label: text.value.editBoard, icon: "edit", disabled: props.actions.readOnly },
  { value: "rename", text: text.value.rename, label: text.value.renameBoard, icon: "type", disabled: props.actions.readOnly },
  { value: "png", text: text.value.image, label: text.value.exportPreview, icon: "image", disabled: !props.actions.document.preview },
]);
/** @param event - Shared toolbar intent. */
function execute(event: QuireKitToolbarExecuteEvent): void {
  if (event.value === "png") downloadWhiteboardPreview(props.ownerDocument, props.actions.document);
  else if (!props.actions.readOnly) { if (event.value === "edit") props.actions.edit(); else if (event.value === "rename") props.actions.rename(); }
}
</script>
<template><QuireThemeProvider :theme="theme"><QuireIconProvider :registry="quireIconRegistry"><QuireToolbar :label="text.actions" :items="items" variant="plain" preserve-focus @execute="execute" /></QuireIconProvider></QuireThemeProvider></template>
