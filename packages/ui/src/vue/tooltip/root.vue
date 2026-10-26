<script setup lang="ts">
import { useQuireOverlayHost } from "../overlay-provider";
import { computed, provide } from "vue";
import { Tooltip } from "@ark-ui/vue/tooltip";
import type {
  TooltipOpenChangeDetails,
  TooltipRootProps
} from "@ark-ui/vue/tooltip";
import {
  defaultTooltipCloseDelay,
  defaultTooltipOpenDelay,
  type QuireKitTooltipPlacement
} from "../../components/tooltip";
import { tooltipFocusPolicyKey } from "./focus-reveal";

/** Vue Tooltip 根组件的公开属性。 */
interface Props {
  /** Shared DOM identity when the target is also another public component’s trigger. */
  readonly triggerId?: string | undefined;
  /** 受控打开状态；省略时由组件管理。 */
  readonly open?: boolean | undefined;
  /** 非受控模式的初始打开状态。 */
  readonly defaultOpen?: boolean;
  /** 悬停或聚焦后的打开延迟，单位为毫秒。 */
  readonly openDelay?: number;
  /** 指针离开控件后的关闭延迟，单位为毫秒。 */
  readonly closeDelay?: number;
  /** 提示相对控件的首选方位。 */
  readonly placement?: QuireKitTooltipPlacement;
  /** 提示与控件的间距，单位为 CSS 像素。 */
  readonly gutter?: number;
  /** 是否停用提示；需要显示禁用原因时使用 subjectDisabled。 */
  readonly disabled?: boolean;
  /** 点击控件时是否关闭提示。 */
  readonly closeOnClick?: boolean;
  /** 在控件上按下指针时是否关闭提示。 */
  readonly closeOnPointerDown?: boolean;
  /** 页面滚动时是否关闭 Tooltip；保留 Tab 聚焦带来的本次自动滚动。 */
  readonly closeOnScroll?: boolean;
  /** Escape 是否关闭 Tooltip。 */
  readonly closeOnEscape?: boolean;
  /** Tooltip 内容的可访问标签。 */
  readonly ariaLabel?: string;
}

/** Vue Tooltip 根组件发出的公开事件。 */
interface Emits {
  /** 受控状态同步事件。 */
  "update:open": [open: boolean];
  /** 每次打开状态变化后的语义事件。 */
  openChange: [open: boolean];
}

/** Vue Tooltip 根组件的组合插槽。 */
interface Slots {
  /** Trigger 与 Content 的组合内容。 */
  readonly default: () => unknown;
}

const portal = useQuireOverlayHost();
const props = withDefaults(defineProps<Props>(), {
  open: undefined,
  defaultOpen: false,
  openDelay: defaultTooltipOpenDelay,
  closeDelay: defaultTooltipCloseDelay,
  placement: "top",
  gutter: 6,
  disabled: false,
  closeOnClick: true,
  closeOnPointerDown: true,
  closeOnScroll: true,
  closeOnEscape: true
});
const emit = defineEmits<Emits>();
defineSlots<Slots>();
provide(tooltipFocusPolicyKey, props);

const rootBindings = computed(resolveRootBindings);

/**
 * 把公开属性投影到 Ark UI/Zag Tooltip 根组件。
 *
 * Tooltip 固定为非交互说明层，不进入 overlay focus stack；flip、slide 与
 * detached 隐藏由 Zag/Floating UI 统一负责。
 *
 * @returns Ark UI 根组件接收的完整绑定对象。
 */
function resolveRootBindings(): TooltipRootProps {
  return {
    ...(props.open === undefined ? { defaultOpen: props.defaultOpen } : { open: props.open }),
    ...(props.triggerId === undefined ? {} : { ids: { trigger: props.triggerId } }),
    openDelay: props.openDelay,
    closeDelay: props.closeDelay,
    disabled: props.disabled,
    closeOnClick: props.closeOnClick,
    closeOnPointerDown: props.closeOnPointerDown,
    closeOnScroll: props.closeOnScroll,
    closeOnEscape: props.closeOnEscape,
    interactive: false,
    lazyMount: true,
    unmountOnExit: true,
    positioning: {
      ...(portal.strategy.value ? { strategy: portal.strategy.value } : {}),
      placement: props.placement,
      gutter: props.gutter,
      flip: true,
      slide: true,
      hideWhenDetached: true
    },
    ...(props.ariaLabel === undefined
      ? {}
      : { "aria-label": props.ariaLabel })
  };
}

/**
 * 转发 Zag machine 的状态变化，同时维持 Vue 受控合同。
 *
 * @param details - Zag machine 返回的打开状态明细。
 * @returns 无返回值。
 */
function handleOpenChange(details: TooltipOpenChangeDetails): void {
  emit("update:open", details.open);
  emit("openChange", details.open);
}
</script>

<template>
  <Tooltip.Root
    v-bind="rootBindings"
    @open-change="handleOpenChange"
  >
    <slot />
  </Tooltip.Root>
</template>
