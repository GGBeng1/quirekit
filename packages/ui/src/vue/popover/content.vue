<script setup lang="ts">
import { useQuireOverlayHost } from "../overlay-provider";
import QuireThemePortal from "../theme-provider/portal.vue";
import { computed, onMounted, ref, useAttrs } from "vue";
import { Popover, usePopoverContext } from "@ark-ui/vue/popover";
import type { QuireKitPopoverBorder } from "../../components/popover";
import { useModalPortal } from "../shared/surface/use-modal-portal";
import { anchoredSurfaceStyle } from "../shared/surface/geometry";

/** Popover Content 的公开属性。 */
interface Props {
  /** Content 与箭头的可选边界强度；默认不显示边框。 */
  readonly border?: QuireKitPopoverBorder;
  /** Portal 的目标元素或 CSS 选择器。 */
  readonly portalTarget?: string | HTMLElement;
  /** 是否渲染与当前 placement 同步的定位箭头。 */
  readonly showArrow?: boolean;
  /** CSS 宽度或像素数；anchor 跟随 Anchor（未指定时为 Trigger）宽度，并受视口约束。 */
  readonly width?: string | number;
  /** none 用于已有内间距的列表，避免叠加内容留白。 */
  readonly padding?: "default" | "none";
}

/** Popover Content 的组合插槽。 */
interface Slots {
  /** 标题、描述、交互内容与关闭动作。 */
  readonly default: () => unknown;
}

const {
  border = "none",
  portalTarget,
  showArrow = true,
  width,
  padding = "default"
} = defineProps<Props>();
defineSlots<Slots>();
defineOptions({ inheritAttrs: false });

const portal = useQuireOverlayHost(() => portalTarget);
const context = usePopoverContext();
const isPortalled = computed(resolvePortalled);
const { hasModalOwner, disabled: portalDisabled } = useModalPortal(() => isPortalled.value, () => context.value.open);
const attrs = useAttrs();
const contentStyle = computed(() => ({
  ...anchoredSurfaceStyle,
  ...(width === undefined ? {} : {
    width: width === 'anchor' ? 'min(var(--reference-width), calc(100vw - 16px))'
      : typeof width === 'number' ? `${width}px` : width
  }),
  ...(padding === 'none' ? { padding: '0', gap: '0' } : {})
}));
// Hydrate each popup beside its trigger before moving it to the shared body target.
// Async demo/route boundaries can hydrate in a different order from server portals.
const mounted = ref(false);
onMounted(() => { mounted.value = true; });

/**
 * 从 Ark UI 上下文读取当前 machine 的 portal 决策。
 *
 * @returns 是否把 positioner 传送到 portal 目标。
 */
function resolvePortalled(): boolean {
  return context.value.portalled;
}
</script>

<template>
  <Teleport :to="portal.target.value" :disabled="portalDisabled || !mounted">
    <QuireThemePortal>
      <Popover.Positioner
        :class="['qk-popover__positioner', hasModalOwner && 'qk-popover__positioner--modal']"
        data-scope="popover"
        data-part="positioner"
      >
        <Popover.Content
          v-bind="attrs"
          :style="contentStyle"
          :class="[
            'qk-popover__content',
            `qk-popover__content--border-${border}`
          ]"
          data-scope="popover"
          data-part="content"
        >
          <slot />
        </Popover.Content>
        <!-- Keep the positioning arrow outside the scrolling content so its tip is not clipped. -->
        <Popover.Arrow
          v-if="showArrow"
          v-show="context.open"
          aria-hidden="true"
          class="qk-popover__arrow"
          data-scope="popover"
          data-part="arrow"
        >
          <Popover.ArrowTip
            :class="[
              'qk-popover__arrow-tip',
              `qk-popover__arrow-tip--border-${border}`
            ]"
          />
        </Popover.Arrow>
      </Popover.Positioner>
    </QuireThemePortal>
  </Teleport>
</template>
