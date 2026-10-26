<script setup lang="ts">
import { Popover } from "@ark-ui/vue/popover";

/** Popover Trigger 的公开属性。 */
interface Props {
  /** 是否将打开行为合并到插槽中的唯一子元素。 */
  readonly asChild?: boolean;
  /** 多 trigger 组合中用于标识当前 trigger 的稳定值。 */
  readonly value?: string;
}

/** Popover Trigger 的组合插槽。 */
interface Slots {
  /** 打开浮层的唯一触发元素。 */
  readonly default: () => unknown;
}

const { asChild = false, value } = defineProps<Props>();
defineSlots<Slots>();
</script>

<template>
  <Popover.Trigger
    :as-child="asChild"
    :value="value"
    data-scope="popover"
    data-part="trigger"
    :class="!asChild && 'qk-popover__trigger'"
  >
    <slot />
  </Popover.Trigger>
</template>
