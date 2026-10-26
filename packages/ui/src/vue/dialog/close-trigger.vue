<script setup lang="ts">
import { Dialog } from "@ark-ui/vue/dialog";

/** Dialog CloseTrigger 的公开属性。 */
interface Props {
  /** 是否把关闭行为合并到唯一子元素。 */
  readonly asChild?: boolean;
  /** 是否禁止当前关闭动作。 */
  readonly disabled?: boolean;
}

/** Dialog CloseTrigger 的组合内容。 */
interface Slots {
  /** 关闭按钮内容。 */
  readonly default: () => unknown;
}

withDefaults(defineProps<Props>(), { asChild: false, disabled: false });
defineSlots<Slots>();
</script>

<template>
  <Dialog.CloseTrigger
    :as-child="asChild"
    :disabled="disabled"
    :class="!asChild && 'qk-dialog__action-trigger'"
  >
    <slot />
  </Dialog.CloseTrigger>
</template>
