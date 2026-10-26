<script setup lang="ts">
import { computed, inject, shallowRef } from "vue";
import { QuireProseImage, QuireButton } from "@quirekit/ui/vue";
import type { VueNodeViewComponentProps } from "@quirekit/msfe-vue";
import type { ImageSource, MsfeImageResource } from "@quirekit/msfe-image";
import { mdLocaleKey } from "../context";
import { mdEditorMessages } from "../messages";
const props = defineProps<VueNodeViewComponentProps<ImageSource, MsfeImageResource>>();
const locale = inject(mdLocaleKey, shallowRef("zh-CN"));
const text = computed(() => mdEditorMessages[locale.value]);
</script>
<template>
  <span class="md-image inline-flex max-w-full items-start gap-qk-inline" data-md-object="image" data-qk-not-prose data-qk-not-typography>
    <!-- Editing selects the image as an object; its action bar owns edit and preview. -->
    <QuireProseImage v-if="nodeView.resource" :src="nodeView.resource.url" :alt="nodeView.attrs.alt" :title="nodeView.attrs.title ?? ''"
      :preview="false" class="min-w-0">
      <template #placeholder><span class="sr-only">{{ text.imageLoading }}</span></template>
      <template #error="{ retry }"><span>{{ text.imageError }}</span><QuireButton variant="outline" @click="retry">{{ text.imageRetry }}</QuireButton></template>
    </QuireProseImage>
    <span v-else role="status">{{ nodeView.status === 'error' ? text.imageError : text.imageLoading }}</span>
  </span>
</template>
