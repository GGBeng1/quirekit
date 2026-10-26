<script setup lang="ts">
import { Menu } from "@ark-ui/vue/menu";
import { Drawer } from "@ark-ui/vue/drawer";
import type { QuireKitActionMenuActionDetails, QuireKitActionMenuIconSlotProps, QuireKitActionMenuProps as Props, QuireKitActionMenuRequest } from "../../components/action-menu";
import type { QuireKitResolvedTaskPresentation, QuireKitTaskCancelReason } from "../../components/task";
import TaskTrigger from "../shared/task/trigger.vue";
import QuireButton from "../button/button.vue";
import Desktop from "./desktop.vue";
import Bottom from "./bottom.vue";
import { useActionMenu } from "./use-action-menu";

/** Public task notifications; execute is the only business entry. */
interface Emits {
  /** Requests controlled open acknowledgement. */
  "update:open": [open: boolean];
  /** Reports one actual session transition. */
  openChange: [open: boolean];
  /** Reports discarded uncommitted task state. */
  cancel: [details: { readonly reason: QuireKitTaskCancelReason; readonly sessionId: string }];
  /** Reports successful execution. */
  action: [details: QuireKitActionMenuActionDetails];
  /** Reports failure of the current request. */
  error: [details: { readonly error: unknown; readonly request: QuireKitActionMenuRequest }];
}
/** Stable task entry and decorative content. */
interface Slots {
  /** One real button; the task merges behavior and ARIA. */
  readonly trigger?: (props: { open: boolean; disabled: boolean; summary: string; presentation: QuireKitResolvedTaskPresentation | undefined }) => unknown;
  /** Non-interactive content region supporting contextmenu and ContextMenu/Shift+F10. */
  readonly context?: () => unknown;
  /** Replaces only an action's decorative icon. */
  readonly icon?: (props: QuireKitActionMenuIconSlotProps) => unknown;
}
const props = withDefaults(defineProps<Props>(), { open: undefined, defaultOpen: false, disabled: false, presentation: "auto" });
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const task = useActionMenu(props, {
  updateOpen: value => emit("update:open", value), openChange: value => emit("openChange", value),
  cancel: details => emit("cancel", details), action: details => emit("action", details), error: details => emit("error", details)
});
const bottom = task.bottom;
defineExpose({ requestClose: task.lifecycle.requestClose });
</script>

<template>
  <TaskTrigger :id="task.triggerId" :disabled="disabled" :prepare="task.prepare" :get-bindings="task.getBindings" @element="task.setTrigger">
    <slot name="trigger" :open="task.lifecycle.open.value" :disabled="disabled" :summary="title" :presentation="task.presentation.resolved.value"><QuireButton>{{ title }}</QuireButton></slot>
  </TaskTrigger>
  <div v-if="$slots.context" role="group" :aria-label="contextLabel ?? title" :tabindex="disabled ? -1 : 0" class="qk-menu__context-trigger"
    :aria-haspopup="task.presentation.resolved.value === 'desktop' ? 'menu' : task.presentation.resolved.value === 'bottom' ? 'dialog' : undefined"
    :aria-expanded="task.lifecycle.open.value" :aria-controls="task.lifecycle.open.value ? task.contentId : undefined" @contextmenu="task.openContext" @keydown="task.openContext"><slot name="context" /></div>
  <Menu.RootProvider :value="task.menu" lazy-mount unmount-on-exit @exit-complete="task.presentation.completeExit('desktop', task.presentation.epoch.value)">
    <Desktop v-if="task.presentation.resolved.value === 'desktop' && task.presentation.phase.value !== 'closed'" :title="title" :description="description"
      :actions="actions" :busy="task.requests.submitting.value" :error-text="task.errorText.value" :status-text="task.pathStatus.value" @activate="task.activate"><template v-if="$slots.icon" #icon="slotProps"><slot name="icon" v-bind="slotProps" /></template></Desktop>
  </Menu.RootProvider>
  <Drawer.RootProvider :value="task.drawer.api.value" lazy-mount unmount-on-exit @exit-complete="task.presentation.completeExit('bottom', task.presentation.epoch.value)">
    <Bottom v-if="task.presentation.resolved.value === 'bottom' && task.presentation.phase.value !== 'closed'" ref="bottom"
      :title="task.level.value.branch?.label ?? title" v-bind="{ ...(description === undefined ? {} : { description }), ...(task.errorText.value === undefined ? {} : { errorText: task.errorText.value }), ...(task.pathStatus.value === undefined ? {} : { statusText: task.pathStatus.value }) }" :actions="task.level.value.actions" :can-go-back="task.path.value.length > 0"
      :busy="task.requests.submitting.value" :layout="layout" :searchable="searchable"
      @activate="task.activate" @back="task.back" @cancel="task.lifecycle.requestClose('cancel')"><template v-if="$slots.icon" #icon="slotProps"><slot name="icon" v-bind="slotProps" /></template></Bottom>
  </Drawer.RootProvider>
</template>
