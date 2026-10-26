<script setup lang="ts">
import type { MdHighlightColor } from "../../highlight/types";
defineProps<{
  /** Effective icon. */ emoji: string;
  /** Background palette name. */ color: MdHighlightColor;
  /** Text palette name; omitted keeps the default text color. */ text?: MdHighlightColor | undefined;
}>();
</script>
<template>
  <section class="qk-prose-container" data-container="highlight" :data-qk-prose-highlight="color" :data-qk-prose-highlight-text="text">
    <div class="qk-prose-container__header"><span class="qk-prose-highlight-icon" aria-hidden="true">{{ emoji }}</span></div>
    <div class="qk-prose-container__body"><slot /></div>
  </section>
</template>
