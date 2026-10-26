<script setup lang="ts">
import { Popover } from "@ark-ui/vue/popover";

/** Popover Description 的组合插槽。 */
interface Slots {
  /** 补充浮层用途或结果影响的说明文字。 */
  readonly default: () => unknown;
}

defineSlots<Slots>();
</script>

<template>
  <Popover.Description
    class="qk-popover__description"
    data-scope="popover"
    data-part="description"
  >
    <slot />
  </Popover.Description>
</template>
