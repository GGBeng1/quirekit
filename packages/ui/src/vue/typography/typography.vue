<script setup lang="ts">
import { computed } from "vue";
import type { QuireKitTypographyProps } from "../../components/typography";
import Abbreviation from "./abbreviation.vue";

const props = withDefaults(defineProps<QuireKitTypographyProps>(), { as: "p" });
defineSlots<{
  /** Native text content; isolate embedded controls with data-qk-not-typography. */
  default?: () => unknown;
}>();
const variantClass = computed(() => props.variant
  ? `qk-type-${props.variant.replace(/[A-Z]/gu, letter => `-${letter.toLowerCase()}`)}`
  : undefined);
</script>

<template>
  <component :is="as === 'abbr' ? Abbreviation : as" :title="title" :class="['qk-typography', variantClass, { 'qk-typography--inline-code': as === 'code' && codeStyle === 'inline' }]"><slot /></component>
</template>
