<script setup lang="ts">
import { Dialog } from "@ark-ui/vue/dialog";
import type { DialogOpenChangeDetails, DialogRootProps } from "@ark-ui/vue/dialog";
import { computed } from "vue";
import type { QuireKitDialogRole } from "../../components/dialog/types";

/** 模态对话框的属性。 */
interface Props {
  /** 内容元素的稳定 ID；同时供浮层定位、焦点和原生 DOM 查询使用。 */
  readonly contentId?: string;
  /** 受控打开状态；省略时由组件管理。 */
  readonly open?: boolean | undefined;
  /** 非受控模式的初始打开状态。 */
  readonly defaultOpen?: boolean;
  /** 没有可见标题时使用的可访问名称。 */
  readonly ariaLabel?: string;
  /** Dialog 或 AlertDialog 角色。 */
  readonly role?: QuireKitDialogRole;
  /** 是否启用模态隔离。 */
  readonly modal?: boolean;
  /** 是否约束键盘焦点。 */
  readonly trapFocus?: boolean;
  /** 是否锁定背景滚动。 */
  readonly preventScroll?: boolean;
  /** 是否在关闭后归还焦点。 */
  readonly restoreFocus?: boolean;
  /** 是否响应 Escape 关闭请求。 */
  readonly closeOnEscape?: boolean;
  /** 是否响应外部交互关闭请求。 */
  readonly closeOnInteractOutside?: boolean;
  /** 打开时首个接收焦点的元素解析器。 */
  readonly initialFocusEl?: () => HTMLElement | null;
  /** 关闭时显式接收焦点的元素解析器。 */
  readonly finalFocusEl?: () => HTMLElement | null;
  /** 是否延迟挂载内容。 */
  readonly lazyMount?: boolean;
  /** 退出完成后是否卸载内容。 */
  readonly unmountOnExit?: boolean;
}

/** Dialog Root 的公开事件。 */
interface Emits {
  /** 同步受控打开状态。 */
  "update:open": [open: boolean];
  /** 通知一次语义打开状态变化。 */
  openChange: [open: boolean];
  /** 按下 Escape 时触发。 */
  escapeKeyDown: [event: KeyboardEvent];
  /** 通知浮层外交互请求。 */
  interactOutside: [event: Event];
  /** 退出动画完成。 */
  exitComplete: [];
}

/** Dialog Root 的组合内容。 */
interface Slots {
  /** Trigger 与 Content 的组合树。 */
  readonly default: () => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  open: undefined,
  defaultOpen: false,
  role: "dialog",
  modal: true,
  trapFocus: true,
  preventScroll: true,
  restoreFocus: true,
  closeOnEscape: true,
  closeOnInteractOutside: true,
  lazyMount: true,
  unmountOnExit: true
});
const emit = defineEmits<Emits>();
defineSlots<Slots>();

const rootBindings = computed<DialogRootProps>(() => ({
  ...(props.contentId === undefined ? {} : { ids: { content: props.contentId } }),
  ...(props.open === undefined ? { defaultOpen: props.defaultOpen } : { open: props.open }),
  role: props.role,
  modal: props.modal,
  trapFocus: props.trapFocus,
  preventScroll: props.preventScroll,
  restoreFocus: props.restoreFocus,
  closeOnEscape: props.closeOnEscape,
  closeOnInteractOutside: props.closeOnInteractOutside,
  lazyMount: props.lazyMount,
  unmountOnExit: props.unmountOnExit,
  ...(props.ariaLabel === undefined ? {} : { "aria-label": props.ariaLabel }),
  ...(props.initialFocusEl === undefined ? {} : { initialFocusEl: props.initialFocusEl }),
  ...(props.finalFocusEl === undefined ? {} : { finalFocusEl: props.finalFocusEl })
}));

/**
 * 把 Zag 的明细事件投影为公开布尔值合同。
 *
 * @param details - Ark Dialog 返回的打开状态明细。
 * @returns 无返回值。
 */
function handleOpenChange(details: DialogOpenChangeDetails): void {
  emit("update:open", details.open);
  emit("openChange", details.open);
}
</script>

<template>
  <Dialog.Root
    v-bind="rootBindings"
    @open-change="handleOpenChange"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @interact-outside="emit('interactOutside', $event)"
    @exit-complete="emit('exitComplete')"
  >
    <slot />
  </Dialog.Root>
</template>
