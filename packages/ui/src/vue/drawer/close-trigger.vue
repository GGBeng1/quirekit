<script setup lang="ts">
import { Drawer } from "@ark-ui/vue/drawer";
import { inject } from "vue";
import { drawerSideKey } from "./context";

/** Drawer CloseTrigger 的公开属性。 */
interface Props {
  /** 是否把关闭行为合并到唯一子元素。 */
  readonly asChild?: boolean;
  /** 是否禁止当前关闭动作。 */
  readonly disabled?: boolean;
}

/** Drawer CloseTrigger 的组合内容。 */
interface Slots {
  /** 关闭按钮内容。 */
  readonly default: () => unknown;
}

withDefaults(defineProps<Props>(), { asChild: false, disabled: false });
defineSlots<Slots>();
const side = inject(drawerSideKey);
</script>

<template>
  <Drawer.CloseTrigger
    :as-child="asChild"
    :disabled="disabled"
    :class="!asChild && ['qk-drawer__close-trigger', side === 'bottom' && 'qk-drawer__close-trigger--touch']"
  >
    <slot />
  </Drawer.CloseTrigger>
</template>
