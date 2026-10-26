<script setup lang="ts">
import { Popover } from "@ark-ui/vue/popover";

/** Popover Title 的组合插槽。 */
interface Slots {
  /** 可访问名称与可见标题。 */
  readonly default: () => unknown;
}

defineSlots<Slots>();
</script>

<template>
  <Popover.Title
    class="qk-popover__title"
    data-scope="popover"
    data-part="title"
  >
    <slot />
  </Popover.Title>
</template>
