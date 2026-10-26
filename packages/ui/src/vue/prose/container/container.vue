<script setup lang="ts">
import { useId } from "vue";
import { QuireIcon } from "../../icon";
import { QuireIconButton } from "../../button";
import { useQuireKitMessages } from "../../locale-provider/context";
import type { QuireKitProseContainerProps } from "./types";
withDefaults(defineProps<QuireKitProseContainerProps>(), {
  tone: "neutral", collapsible: false,
});
const text = useQuireKitMessages("prose");
const open = defineModel<boolean>("open", { default: true });
const bodyId = useId();
</script>
<template>
  <section class="qk-prose-container" :data-tone="tone">
    <div class="qk-prose-container__header">
      <QuireIconButton v-if="collapsible" size="sm" variant="ghost" :label="open ? text.collapse(title) : text.expand(title)"
        :aria-expanded="open" :aria-controls="bodyId" data-qk-not-prose @click="open = !open">
        <QuireIcon :name="open ? 'chevronDown' : 'chevronRight'" />
      </QuireIconButton>
      <span>{{ title }}</span>
    </div>
    <div :id="bodyId" class="qk-prose-container__body" :hidden="collapsible && !open"><slot /></div>
  </section>
</template>
