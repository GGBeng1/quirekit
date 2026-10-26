<script setup lang="ts">
import { Drawer } from "@ark-ui/vue/drawer";
import type { QuireKitDrawerRootProps } from "../../components/drawer";
import { useDrawerRuntime } from "./use-runtime";

/** Drawer Root 的公开事件。 */
interface Emits {
  /** 同步受控打开状态。 */
  "update:open": [open: boolean];
  /** 通知一次语义打开状态变化。 */
  openChange: [open: boolean];
  /** 同步受控停靠位置。 */
  "update:snapPoint": [snapPoint: number | string | null];
  /** 通知一次停靠位置变化。 */
  snapPointChange: [snapPoint: number | string | null];
  /** 同步受控 Trigger 标识。 */
  "update:triggerValue": [triggerValue: string | null];
  /** 通知一次 Trigger 标识变化。 */
  triggerValueChange: [triggerValue: string | null];
  /** 通知退出动画已经完成。 */
  exitComplete: [];
}

/** Drawer Root 的组合内容。 */
interface Slots {
  /** Trigger 与 Content 的组合树。 */
  readonly default: () => unknown;
}

const props = withDefaults(defineProps<QuireKitDrawerRootProps>(), {
  open: undefined,
  defaultOpen: false,
  side: "end",
  role: "dialog",
  modal: true,
  trapFocus: true,
  preventScroll: true,
  restoreFocus: true,
  closeOnEscape: true,
  closeOnInteractOutside: true,
  snapPoints: () => [1],
  snapToSequentialPoints: false,
  preventDragOnScroll: true,
  dragEnabled: true,
  lazyMount: true,
  unmountOnExit: true
});
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const { api, requestClose } = useDrawerRuntime(props, {
  updateOpen: open => emit("update:open", open),
  openChange: open => emit("openChange", open),
  closeRequest: request => props.onCloseRequest?.(request),
  snapPointChange: details => {
    emit("update:snapPoint", details.snapPoint);
    emit("snapPointChange", details.snapPoint);
  },
  triggerValueChange: details => {
    emit("update:triggerValue", details.value);
    emit("triggerValueChange", details.value);
  }
});
defineExpose({ requestClose });
</script>

<template>
  <Drawer.RootProvider
    :value="api"
    :lazy-mount="lazyMount"
    :unmount-on-exit="unmountOnExit"
    @exit-complete="emit('exitComplete')"
  >
    <slot />
  </Drawer.RootProvider>
</template>
