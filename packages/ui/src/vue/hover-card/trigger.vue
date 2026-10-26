<script setup lang="ts">
import { computed } from 'vue';
import { HoverCard, useHoverCardContext } from '@ark-ui/vue/hover-card';

/** 预览触发元素。 */
interface Props {
  /** 将行为合并到唯一子元素，保留链接或按钮的语义。 */
  readonly asChild?: boolean;
}
const { asChild = false } = defineProps<Props>();
defineSlots<{ /** 可聚焦的按钮或链接。 */ default(): unknown }>();
const api = useHoverCardContext();
const descriptionId = computed(() => api.value.open ? api.value.getContentProps().id : undefined);
/** 点击补充触摸入口；不阻止原链接导航或按钮的默认行为。 */
function reveal(): void { api.value.setOpen(true); }
</script>

<template>
  <HoverCard.Trigger :as-child="asChild" :type="asChild ? undefined : 'button'" :aria-describedby="descriptionId" @click="reveal"><slot /></HoverCard.Trigger>
</template>
