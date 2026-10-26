<script setup lang="ts">
import { Popover } from "@ark-ui/vue/popover";
import type { PopoverRuntimeProps as Props } from "./types";
import { usePopoverRuntime } from "./use-runtime";

// Root owns behavior only; DOM attributes belong on Trigger or Content.
defineOptions({ inheritAttrs: false });

/** Vue Popover 根组件发出的公开事件。 */
interface Emits {
  /** 受控状态同步事件。 */
  "update:open": [open: boolean];
  /** 每次打开状态变化后的语义事件。 */
  openChange: [open: boolean];
  /** 按下 Escape 时触发，可阻止对应关闭请求。 */
  escapeKeyDown: [event: KeyboardEvent];
  /** 与浮层外部交互时触发，可阻止对应关闭请求。 */
  interactOutside: [event: Event];
}

/** Vue Popover 根组件的组合插槽。 */
interface Slots {
  /** Trigger、Anchor 与 Content 的组合内容。 */
  readonly default: () => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  open: undefined,
  defaultOpen: false,
  placement: "bottom-start",
  portalled: true,
  modal: false,
  autoFocus: true,
  restoreFocus: true,
  closeOnEscape: true,
  closeOnInteractOutside: true,
  hideWhenDetached: true
});
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const { api } = usePopoverRuntime(props, {
  updateOpen: open => emit("update:open", open),
  openChange: open => emit("openChange", open),
  escapeKeyDown: event => emit("escapeKeyDown", event),
  interactOutside: event => emit("interactOutside", event)
});
</script>

<template>
  <Popover.RootProvider :value="api">
    <slot />
  </Popover.RootProvider>
</template>
