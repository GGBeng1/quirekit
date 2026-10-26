<script setup lang="ts">
import type { ContainerControlProps } from "@quirekit/msfe-markdown-extras";
import { QuireIconButton, QuireIcon } from "@quirekit/ui/vue";
defineProps<{ /** Current guarded source-neutral action. */ view: ContainerControlProps }>();
</script>
<template>
  <QuireIconButton :label="view.label" :aria-expanded="view.expanded" size="sm" variant="ghost" data-qk-not-prose @click="view.toggle">
    <QuireIcon :name="view.expanded ? 'chevronDown' : 'chevronRight'" />
  </QuireIconButton>
</template>
