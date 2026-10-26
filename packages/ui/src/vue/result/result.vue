<script setup lang="ts">
import QuireTypography from "../typography/typography.vue";
import { computed, useId } from 'vue';
import { QuireIcon } from '../icon';
import ResultIllustration from './illustration.vue';
import type { QuireKitResultProps, QuireKitResultSlots } from './types';

const props = withDefaults(defineProps<QuireKitResultProps>(), {
  status: 'info', size: 'sm', titleAs: 'h3', icon: undefined, illustrated: false,
});
defineSlots<QuireKitResultSlots>();
const id = `qk-result-${useId()}`;
const titleId = `${id}-title`;
const descriptionId = `${id}-description`;
const accessibleLabel = computed(() => props.label?.trim() || undefined);
const iconName = computed(() => props.icon === false ? undefined : props.icon ?? ({
  info: 'circleInfo', success: 'circleCheck', warning: 'triangleAlert',
  error: 'circleX', forbidden: 'lock', 'not-found': 'fileX',
}[props.status]));
</script>

<template>
  <div
    role="group"
    :aria-label="accessibleLabel"
    :aria-labelledby="accessibleLabel ? undefined : titleId"
    :aria-describedby="description || $slots.description ? descriptionId : undefined"
    :data-status="status"
    :class="['qk-result', `qk-result--${size}`, `qk-result--${status}`]"
  >
    <div v-if="$slots.illustration || illustrated" class="qk-result__visual" aria-hidden="true">
      <div :class="['qk-result__illustration', `qk-result__illustration--${size}`]">
        <slot name="illustration" :status="status" :size="size">
          <ResultIllustration :status="status" />
        </slot>
      </div>
    </div>
    <div v-else-if="$slots.icon || iconName" class="qk-result__visual" aria-hidden="true">
      <slot name="icon" :status="status" :size="size">
        <span :class="['qk-result__icon', `qk-result__icon--${size}`]">
          <QuireIcon :name="iconName" :size="size === 'sm' ? 20 : 24" />
        </span>
      </slot>
    </div>
    <div class="qk-result__copy">
      <QuireTypography :as="titleAs" :variant="size === 'sm' ? 'heading' : 'sectionTitle'" :id="titleId" :class="['qk-result__title', `qk-result__title--${size}`]">
        <slot name="title" :status="status" :size="size">{{ title }}</slot>
      </QuireTypography>
      <QuireTypography as="div" variant="body" v-if="description || $slots.description" :id="descriptionId" class="qk-result__description">
        <slot name="description" :status="status" :size="size">{{ description }}</slot>
      </QuireTypography>
    </div>
    <div v-if="$slots.default" class="qk-result__content"><slot :status="status" :size="size" /></div>
    <div v-if="$slots.actions" class="qk-result__actions"><slot name="actions" :status="status" :size="size" /></div>
  </div>
</template>
