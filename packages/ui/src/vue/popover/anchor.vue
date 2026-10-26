<script setup lang="ts">
import { Popover } from "@ark-ui/vue/popover";

/** Popover Anchor 的公开属性。 */
interface Props {
  /** 是否把锚点属性合并到插槽提供的唯一子元素。 */
  readonly asChild?: boolean;
}

/** Popover Anchor 的组合插槽。 */
interface Slots {
  /** 提供独立定位锚点的唯一元素。 */
  readonly default: () => unknown;
}

const { asChild = true } = defineProps<Props>();
defineSlots<Slots>();
</script>

<template>
  <Popover.Anchor
    :as-child="asChild"
    data-scope="popover"
    data-part="anchor"
  >
    <slot />
  </Popover.Anchor>
</template>
