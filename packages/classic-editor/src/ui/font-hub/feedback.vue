<script setup lang="ts">
import { inject, watch } from "vue";
import { fontHubToasterKey } from "./notifications";

/** One operation result forwarded to the dialog's public Toast queue. */
interface Props {
  /** Visible operation result. */
  readonly message: string;
  /** Semantic result tone. */
  readonly tone: "error" | "success";
}

const props = defineProps<Props>();
const toaster = inject(fontHubToasterKey);
watch(
  () => props.message,
  (message) => {
    if (!message || !toaster) return;
    toaster.remove();
    toaster.create({
      description: message,
      type: props.tone,
      closable: true,
      duration: props.tone === "error" ? 5000 : 3000
    });
  }
);
</script>

<template></template>
