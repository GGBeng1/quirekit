<script setup lang="ts">
import { Popover } from '@ark-ui/vue/popover';
import { inject } from 'vue';
import { pickerSurfaceKey } from './context';

const picker = inject(pickerSurfaceKey, undefined);
</script>
<template>
  <!-- Only the input surface determines placement. Keep Ark DateInput's own
       control attributes intact instead of merging two primitives with as-child. -->
  <Popover.Anchor v-if="picker && !picker.bottom.value" class="qk-picker__control-anchor"><slot /></Popover.Anchor>
  <slot v-else />
</template>
