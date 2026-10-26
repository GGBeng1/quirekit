<script setup lang="ts">
import QuireTypography from "../typography/typography.vue";
import { useId } from 'vue';
import type { QuireKitCardProps } from './types';
withDefaults(defineProps<QuireKitCardProps>(), {
  as: 'div', titleAs: 'h3', variant: 'outline', density: 'comfortable', divided: false
});
defineSlots<{
  /** Main content; omitted regions do not reserve padding. */
  default?: () => unknown;
  /** Replaces the complete automatic header, including its trailing area. */
  header?: () => unknown;
  /** Title content inside the selected heading element. */
  title?: () => unknown;
  /** Description content below the title. */
  description?: () => unknown;
  /** Independent header actions or status; may wrap after the title. */
  trailing?: () => unknown;
  /** Summary, metadata or independent actions following the body. */
  footer?: () => unknown;
}>();
const titleId = `qk-card-${useId()}-title`;
</script>
<template>
  <component :is="as" :class="['qk-card', `qk-card--${variant}`, `qk-card--${density}`]"
    :aria-labelledby="as !== 'div' && !$slots.header && (title || $slots.title) ? titleId : undefined">
    <div v-if="$slots.header || title || description || $slots.title || $slots.description || $slots.trailing" class="qk-card__section qk-card__header" data-part="header">
      <slot name="header">
        <div v-if="title || description || $slots.title || $slots.description" class="qk-card__copy">
          <QuireTypography :as="titleAs" variant="heading" v-if="title || $slots.title" :id="titleId" class="qk-card__title"><slot name="title">{{ title }}</slot></QuireTypography>
          <QuireTypography as="div" variant="compact" v-if="description || $slots.description" class="qk-card__description"><slot name="description">{{ description }}</slot></QuireTypography>
        </div>
        <div v-if="$slots.trailing" class="qk-card__trailing"><slot name="trailing" /></div>
      </slot>
    </div>
    <div v-if="$slots.default" :class="['qk-card__section', 'qk-card__body', { 'qk-card__section--divided': divided && ($slots.header || title || description || $slots.title || $slots.description || $slots.trailing) }]" data-part="body"><slot /></div>
    <div v-if="$slots.footer" :class="['qk-card__section', 'qk-card__footer', { 'qk-card__section--divided': divided && ($slots.default || $slots.header || title || description || $slots.title || $slots.description || $slots.trailing) }]" data-part="footer"><slot name="footer" /></div>
  </component>
</template>
