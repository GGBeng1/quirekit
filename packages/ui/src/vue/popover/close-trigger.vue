<script setup lang="ts">
import { Popover } from "@ark-ui/vue/popover";
import { useQuireKitMessages } from "../locale-provider/context";

/** Popover CloseTrigger 的公开属性。 */
interface Props {
  /** 关闭动作的具体可访问名称，例如“关闭层级列表”；省略时取自语言包。 */
  readonly label?: string;
  /** 是否把关闭行为合并到插槽提供的唯一子元素。 */
  readonly asChild?: boolean;
}

/** Popover CloseTrigger 的组合插槽。 */
interface Slots {
  /** 可选的自定义关闭按钮或图标。 */
  readonly default?: () => unknown;
}

const {
  label,
  asChild = false
} = defineProps<Props>();
defineSlots<Slots>();
const text = useQuireKitMessages("popover");
</script>

<template>
  <Popover.CloseTrigger
    :as-child="asChild"
    :aria-label="label ?? text.close"
    data-scope="popover"
    data-part="close-trigger"
    :class="!asChild && 'qk-popover__close-trigger'"
  >
    <slot>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    </slot>
  </Popover.CloseTrigger>
</template>
