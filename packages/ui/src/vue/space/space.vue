<script setup lang="ts">
import { computed } from 'vue';
import type { CSSProperties } from 'vue';
import type { QuireKitSpaceProps } from './types';
import { resolveSpaceGap } from './spacing';

const props = withDefaults(defineProps<QuireKitSpaceProps>(), {
  as: 'div', orientation: 'horizontal', gap: 'inline', justify: 'start', wrap: true, block: false
});
defineSlots<{
  /** Direct children retain their native structure, keys and keyboard behavior. */
  default?: () => unknown;
}>();
const style = computed<CSSProperties>(() => ({
  rowGap: resolveSpaceGap(props.rowGap ?? props.gap),
  columnGap: resolveSpaceGap(props.columnGap ?? props.gap),
  alignItems: props.align ?? (props.orientation === 'horizontal' ? 'center' : 'stretch'),
  justifyContent: props.justify === 'between' ? 'space-between' : props.justify
}));
</script>
<template>
  <component :is="as" :class="['qk-space', `qk-space--${orientation}`, {
    'qk-space--block': block,
    'qk-space--wrap': wrap && orientation === 'horizontal'
  }]" :style="style" :data-orientation="orientation"><slot /></component>
</template>
