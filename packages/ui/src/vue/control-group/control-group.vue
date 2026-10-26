<script setup lang="ts">
import type { QuireKitControlGroupProps } from './types';

withDefaults(defineProps<QuireKitControlGroupProps>(), {
  orientation: 'horizontal',
  block: false
});

defineSlots<{
  /** Adjacent Input, Select and Button controls, using the same explicit child size. */
  default?: () => unknown;
}>();
</script>

<template>
  <div
    role="group"
    :class="['qk-control-group', `qk-control-group--${orientation}`, block && 'qk-control-group--block']"
    :data-orientation="orientation"
  ><slot /></div>
</template>
