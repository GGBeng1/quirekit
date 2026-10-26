<script setup lang="ts">
import ClassicEditorFontHubPanel from "@classic/ui/font-hub";
import type { ClassicFontLibraryToolbarController } from "./types";
const props = defineProps<{ context: ClassicFontLibraryToolbarController }>();
const { hubOpen, context: host, library, errorMessage } = props.context;
</script>
<template>
  <span v-if="errorMessage" role="alert" class="qk-classic-editor__font-library-error">{{ errorMessage }}</span>
  <ClassicEditorFontHubPanel v-model:open="hubOpen" :theme-root="host.root" :library="library" :locale="host.locale" />
</template>
