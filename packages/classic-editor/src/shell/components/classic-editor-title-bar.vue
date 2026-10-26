<script setup lang="ts">
import type { ClassicEditorShellModel } from "../types";
import ClassicEditorDocumentIdentity from "./title-bar/document-identity.vue";
import ClassicEditorProductMenu from "./title-bar/product-menu.vue";

/** Reactive inputs rendered by the document identity row. */
interface ClassicEditorTitleBarProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
}

defineProps<ClassicEditorTitleBarProps>();
</script>

<template>
  <div class="qk-classic-editor__title-bar" data-qk-shell-row="identity">
    <div class="qk-classic-editor__title-leading">
      <ClassicEditorProductMenu :model="model" />
      <ClassicEditorDocumentIdentity :model="model" />
    </div>
  </div>
</template>
