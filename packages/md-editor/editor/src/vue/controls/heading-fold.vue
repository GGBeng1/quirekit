<script setup lang="ts">
import type { HeadingFoldControlProps } from "@quirekit/msfe-heading";
import { QuireIconButton, QuireIcon } from "@quirekit/ui/vue";
defineProps<{ /** Guarded native heading fold intent. */ view: HeadingFoldControlProps }>();
</script>
<template>
  <span class="msfe-heading-toggle" data-qk-not-prose>
    <QuireIconButton :label="view.label" :aria-expanded="view.expanded" size="xs" variant="ghost" @click="view.toggle">
      <QuireIcon name="triangleDown" :size="16" :style="{ transform: view.expanded ? undefined : 'rotate(-90deg)' }" />
    </QuireIconButton>
  </span>
</template>
