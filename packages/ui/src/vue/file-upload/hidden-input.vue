<script setup lang="ts">
import { FileUpload, useFileUploadContext } from "@ark-ui/vue/file-upload";
import { onMounted, useTemplateRef } from "vue";
import type { ComponentPublicInstance } from "vue";

const fileUpload = useFileUploadContext();
const input = useTemplateRef<ComponentPublicInstance>("input");

/** Initializes native form state before later collection changes are synchronized by Ark. */
function initializeFiles(): void {
  const element = input.value?.$el as HTMLInputElement | undefined;
  if (!element || fileUpload.value.acceptedFiles.length === 0) return;
  const transfer = new DataTransfer();
  fileUpload.value.acceptedFiles.forEach(file => transfer.items.add(file));
  element.files = transfer.files;
}

onMounted(initializeFiles);
</script>

<template>
  <FileUpload.HiddenInput ref="input" />
</template>
