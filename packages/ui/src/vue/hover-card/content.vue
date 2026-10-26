<script setup lang="ts">
import QuireThemePortal from "../theme-provider/portal.vue";
import { onMounted, ref, useAttrs } from 'vue';
import { HoverCard, useHoverCardContext } from '@ark-ui/vue/hover-card';
import { useModalPortal } from '../shared/surface/use-modal-portal';

/** 阅读卡片的容器选项。 */
interface Props {
  /** 首选宽度，仍受屏幕可用空间约束。 */
  readonly width?: string;
  /** 是否传送至 portal 目标。 */
  readonly portalled?: boolean;
  /** Portal 的目标元素或选择器。 */
  readonly portalTarget?: string | HTMLElement;
  /** 是否显示指向触发器的箭头。 */
  readonly showArrow?: boolean;
}
const { width = '20rem', portalled = true, portalTarget = 'body', showArrow = false } = defineProps<Props>();
defineSlots<{ /** 摘要信息；需要操作的内容使用 Popover。 */ default(): unknown }>();
defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
const api = useHoverCardContext();
const { hasModalOwner, disabled } = useModalPortal(() => portalled, () => api.value.open);
const mounted = ref(false);
onMounted(() => { mounted.value = true; });
</script>

<template>
  <Teleport :to="portalTarget" :disabled="disabled || !mounted">
    <QuireThemePortal>
      <HoverCard.Positioner :class="['qk-hover-card__positioner', hasModalOwner && 'qk-hover-card__positioner--modal']">
        <HoverCard.Content v-bind="attrs" class="qk-hover-card__content" :style="{ '--qk-hover-card-width': width }"><slot /></HoverCard.Content>
        <HoverCard.Arrow v-if="showArrow" class="qk-hover-card__arrow" aria-hidden="true">
          <HoverCard.ArrowTip class="qk-hover-card__arrow-tip" />
        </HoverCard.Arrow>
      </HoverCard.Positioner>
    </QuireThemePortal>
  </Teleport>
</template>
