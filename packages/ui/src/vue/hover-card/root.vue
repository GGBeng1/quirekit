<script setup lang="ts">
import { computed, ref } from 'vue';
import { HoverCard, useHoverCard } from '@ark-ui/vue/hover-card';
import { useModalSurfaceOwner } from '../shared/surface/use-modal-owner';
import type { QuireKitHoverCardProps as Props } from './types';

const props = withDefaults(defineProps<Props>(), {
  open: undefined, defaultOpen: false, openDelay: 600, closeDelay: 300,
  disabled: false, placement: 'bottom-start', gutter: 8
});
const emit = defineEmits<{
  /** 受控状态更新请求。 */
  'update:open': [open: boolean];
  /** 打开或关闭请求。 */
  openChange: [open: boolean];
}>();
defineSlots<{ /** Trigger 与 Content。 */ default(): unknown }>();
defineOptions({ inheritAttrs: false });
const owner = useModalSurfaceOwner();
const internalOpen = ref(props.defaultOpen);
// A retained modal cannot leave a hidden child registered in the dismiss stack.
const api = useHoverCard(computed(() => ({
  open: !props.disabled && owner.ready.value && (props.open ?? internalOpen.value),
  disabled: props.disabled || !owner.ready.value,
  openDelay: props.openDelay,
  closeDelay: props.closeDelay,
  positioning: { placement: props.placement, gutter: props.gutter, flip: true, slide: true, hideWhenDetached: true },
  onOpenChange: ({ open }: { open: boolean }) => {
    if (!owner.ready.value || props.disabled) return;
    internalOpen.value = open;
    emit('update:open', open);
    emit('openChange', open);
  }
})));
</script>

<template>
  <HoverCard.RootProvider :value="api" lazy-mount unmount-on-exit><slot /></HoverCard.RootProvider>
</template>
