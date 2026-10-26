<script setup lang="ts">
import { EditorUIColorButton } from "@quirekit/editor-ui/vue";
import type { QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import type { ClassicColorToolbarController } from "./types";
const props = defineProps<{
  /** Current configured entry and its document-command adapter. */
  scope: QuireKitToolbarRendererScope;
}>();
const { disclosureLabel, labels, palette, actionState, recentColors, editableColor, resetActive, previewColor, commitColor, resetColor, applyCurrentColor } = props.scope.context as ClassicColorToolbarController;
</script>
<template>
 <EditorUIColorButton :scope="scope" :disclosure-label="disclosureLabel" :color="editableColor" :reset-active="resetActive"
  :recent-colors="recentColors" :picker-props="{ ...labels, ...palette }" :action-state="actionState"
  @action="applyCurrentColor" @preview="previewColor" @commit="commitColor" @reset="resetColor" />
</template>
