<script setup lang="ts">
import { computed, inject, shallowRef } from "vue";
import { QuireButton } from "@quirekit/ui/vue";
import type { PreviewControlProps } from "@quirekit/msfe-markdown-extras";
import { mdLocaleKey } from "../context";
import { mdEditorMessages } from "../messages";
defineProps<{ /** Semantic actions from the existing cancellable renderer. */ view: PreviewControlProps }>();
const locale = inject(mdLocaleKey, shallowRef("zh-CN"));
const text = computed(() => mdEditorMessages[locale.value]);
</script>
<template>
  <span v-if="view.status !== 'ready'" data-qk-not-prose class="inline-flex items-center gap-qk-inline">
    <!-- Block previews are edited through object selection; only rendering status and retry remain here. -->
    <span v-if="view.status === 'loading'" role="status" class="qk-type-helper text-qk-text-secondary">{{ text.loadingPreview }}</span>
    <span v-if="view.status === 'error'" role="status" class="qk-type-helper text-qk-text-secondary">{{ text.failedPreview }}</span>
    <QuireButton v-if="view.status === 'error'" variant="text" size="sm" @click="view.retry">{{ text.retryPreview }}</QuireButton>
  </span>
</template>
