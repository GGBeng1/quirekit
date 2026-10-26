<script setup lang="ts">
import { useMindEditorMessages } from "../messages";
import { QuireButton, QuireDialogContent, QuireDialogRoot } from "@quirekit/ui/vue";
import type { MindEditorFeedbackProps } from "./types";
defineProps<MindEditorFeedbackProps>();
const { t } = useMindEditorMessages();
const emit = defineEmits<{ /** Dismisses only this result, retaining the current draft. */ close: [] }>();
</script>

<template>
  <QuireDialogRoot :open="!!message" role="alertdialog" :close-on-interact-outside="false"
    v-bind="finalFocusEl ? { finalFocusEl } : {}" @update:open="open => { if (!open) emit('close'); }">
    <QuireDialogContent :title="title ?? t('failed')" :size="detailed ? 'medium' : 'small'">
      <div class="qk-mind-editor__feedback-body"><p>{{ message }}</p><slot /></div>
      <template #footer><QuireButton size="sm" color="primary" variant="solid" @click="emit('close')">{{ dismissLabel ?? t('dismiss') }}</QuireButton></template>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>

<style>
.qk-mind-editor__feedback-body { overflow-wrap: anywhere; }
.qk-mind-editor__feedback-body > p:first-child { margin-top: 0; }
</style>
