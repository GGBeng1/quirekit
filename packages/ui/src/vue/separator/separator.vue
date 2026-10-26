<script setup lang="ts">
import { useId } from 'vue';
import type { QuireKitSeparatorProps } from './types';
withDefaults(defineProps<QuireKitSeparatorProps>(), {
  orientation: 'horizontal', position: 'center', type: 'solid', decorative: false, stretch: false
});
defineSlots<{
  /** Static label or graphic with text; actions must remain outside this slot. */
  default?: () => unknown;
}>();
const labelId = `qk-separator-${useId()}-label`;
</script>
<template>
  <div :class="['qk-separator', `qk-separator--${orientation}`, `qk-separator--${type}`, {
    'qk-separator--inline': orientation === 'vertical' && !stretch && !(label || $slots.default),
    'qk-separator--stretch': orientation === 'vertical' && stretch
  }]"
    :role="decorative ? 'presentation' : 'separator'"
    :aria-orientation="decorative ? undefined : orientation"
    :aria-labelledby="!decorative && (label || $slots.default) ? labelId : undefined"
    :data-orientation="orientation">
    <span v-if="!(label || $slots.default) || position !== 'start'" class="qk-separator__line" aria-hidden="true" />
    <span v-if="label || $slots.default" :id="labelId" class="qk-separator__label"><slot>{{ label }}</slot></span>
    <span v-if="(label || $slots.default) && position !== 'end'" class="qk-separator__line" aria-hidden="true" />
  </div>
</template>
