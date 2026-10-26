<script setup lang="ts">
import { computed, inject, shallowRef } from "vue";
import { QuireCheckbox } from "@quirekit/ui/vue";
import type { VueNodeViewComponentProps } from "@quirekit/msfe-vue";
import type { TaskAttributes } from "@quirekit/msfe-prose";
import { mdLocaleKey } from "../context";
import { mdEditorMessages } from "../messages";
defineProps<VueNodeViewComponentProps<TaskAttributes>>();
const locale = inject(mdLocaleKey, shallowRef("zh-CN"));
const text = computed(() => mdEditorMessages[locale.value]);
</script>
<template>
  <QuireCheckbox class="qk-prose-task-marker" :label="text.taskLabel" :checked="nodeView.attrs.checked" :read-only="nodeView.readOnly" data-qk-not-prose
    @update:checked="nodeView.updateAttributes({ checked: $event === true })"><span class="sr-only">{{ text.taskLabel }}</span></QuireCheckbox>
</template>
