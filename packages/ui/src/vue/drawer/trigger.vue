<script setup lang="ts">
import { Drawer } from "@ark-ui/vue/drawer";
import { computed } from "vue";

/** Drawer Trigger 的公开属性。 */
interface Props {
  /** 是否将打开行为合并到唯一子元素。 */
  readonly asChild?: boolean;
  /** 多 trigger 场景的稳定值。 */
  readonly value?: string;
}

/** Drawer Trigger 的组合内容。 */
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
  <Drawer.Trigger v-bind="optionalBindings" :as-child="asChild" class="qk-drawer__trigger">
    <slot />
  </Drawer.Trigger>
</template>
