<script setup lang="ts">
import { Dialog } from "@ark-ui/vue/dialog";
import { computed } from "vue";

/** Dialog Trigger 的公开属性。 */
interface Props {
  /** 是否将打开行为合并到唯一子元素。 */
  readonly asChild?: boolean;
  /** 多 trigger 场景的稳定值。 */
  readonly value?: string;
}

/** Dialog Trigger 的组合内容。 */
interface Slots {
  /** 接收 trigger 行为的唯一内容。 */
  readonly default: () => unknown;
}

const props = withDefaults(defineProps<Props>(), { asChild: false });
defineSlots<Slots>();

const optionalBindings = computed(() => (
  props.value === undefined ? {} : { value: props.value }
));
</script>

<template>
  <Dialog.Trigger v-bind="optionalBindings" :as-child="asChild" class="qk-dialog__trigger">
    <slot />
  </Dialog.Trigger>
</template>
