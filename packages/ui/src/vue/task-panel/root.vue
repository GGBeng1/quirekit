<script setup lang="ts">
import { useQuireOverlayHost } from "../overlay-provider";
import { Drawer } from "@ark-ui/vue/drawer";
import { Popover } from "@ark-ui/vue/popover";
import { onBeforeUnmount, shallowRef, watch } from "vue";
import type { QuireKitTaskPanelProps as Props } from "../../components/task-panel/types";
import type { QuireKitTaskCancelReason, QuireKitTaskCloseReason } from "../../components/task";
import TaskTrigger from "../shared/task/trigger.vue";
import DrawerFrame from "../drawer/content-frame.vue";
import PopoverContent from "../popover/content.vue";
import QuireButton from "../button/button.vue";
import QuireIconButton from "../button/icon-button.vue";
import QuireIcon from "../icon/icon.vue";
import { useQuireKitMessages } from "../locale-provider/context";
import type { TaskPanelSlots } from "./types";
import { useTaskPanel } from "./runtime";
const props = withDefaults(defineProps<Props>(), { open: undefined, presentation: "auto", disabled: false, busy: false, restoreFocus: true });
const emit = defineEmits<{
  /** Controlled request. */ "update:open": [open: boolean];
  /** Accepted session transition. */ openChange: [open: boolean];
  /** Uncommitted session ended. */ cancel: [details: { reason: QuireKitTaskCancelReason; sessionId: string }];
  /** Navigate inside the same session. */ back: [];
  /** Physical content mount/release for owner-local interop; no editor or layout work. */ contentElementChange: [element: HTMLElement | null];
}>();
defineSlots<TaskPanelSlots>();
const host = useQuireOverlayHost(() => props.portalTarget);
const text = useQuireKitMessages("actionMenu");
const header = shallowRef<HTMLElement | null>(null);
watch(header, element => emit("contentElementChange", element?.parentElement ?? null), { flush: "post" });
onBeforeUnmount(() => { if (header.value) emit("contentElementChange", null); });
const task = useTaskPanel(props, { updateOpen: value => emit("update:open", value), openChange: value => emit("openChange", value),
  begin: () => {}, end: () => {}, cancel: details => emit("cancel", details) });
/** @returns Whether the current shell accepted dismissal. */
function close(): boolean { return requestClose("close-trigger"); }
/** @param reason - Current user or successful action close. @returns Whether the guarded request was accepted. */
function requestClose(reason: QuireKitTaskCloseReason = "programmatic"): boolean { return !props.busy && task.lifecycle.requestClose(reason); }
defineExpose({ requestClose });
</script>
<template>
  <TaskTrigger v-if="$slots.trigger" :id="task.triggerId" :disabled="disabled" :prepare="task.prepare" :get-bindings="task.getBindings" @element="task.setTrigger">
    <slot name="trigger" :open="task.lifecycle.open.value" />
  </TaskTrigger>
  <Popover.RootProvider :value="task.popover.api.value" lazy-mount unmount-on-exit @exit-complete="task.presentation.completeExit('desktop', task.presentation.epoch.value)">
    <PopoverContent v-if="task.presentation.resolved.value === 'desktop' && task.presentation.phase.value !== 'closed'" :inert="!task.lifecycle.open.value || undefined" :aria-hidden="!task.lifecycle.open.value || undefined" :aria-label="title" :width="width ?? 352" :portal-target="host.target.value" padding="none" :show-arrow="false" class="qk-task-panel" :aria-busy="busy || undefined">
      <header ref="header" class="qk-task-panel__header">
        <QuireButton v-if="canGoBack" variant="text" :disabled="busy" @click="emit('back')">{{ text.back }}</QuireButton>
        <Popover.Title class="qk-drawer__title">{{ title }}</Popover.Title>
        <QuireIconButton :label="text.close" variant="text" :disabled="busy" @click="close"><QuireIcon name="close" :size="16" /></QuireIconButton>
      </header>
      <div class="qk-task-panel__body"><slot /></div>
      <footer v-if="$slots.footer" class="qk-task-panel__footer"><slot name="footer" /></footer>
    </PopoverContent>
  </Popover.RootProvider>
  <Drawer.RootProvider :value="task.drawer.api.value" lazy-mount unmount-on-exit @exit-complete="task.presentation.completeExit('bottom', task.presentation.epoch.value)">
    <DrawerFrame v-if="task.presentation.resolved.value === 'bottom' && task.presentation.phase.value !== 'closed'" :content-inert="!task.lifecycle.open.value" :title="title" :portal-target="portalTarget ?? task.trigger.value?.ownerDocument.body ?? 'body'" :show-close="false" :content-style="task.bottomStyle.value" :body-style="{ padding: 'var(--qk-space-surface-compact)', paddingInlineStart: 'max(var(--qk-space-surface-compact), env(safe-area-inset-left))', paddingInlineEnd: 'max(var(--qk-space-surface-compact), env(safe-area-inset-right))', paddingBottom: 'max(var(--qk-space-surface-compact), env(safe-area-inset-bottom))', overscrollBehavior: 'contain' }" content-class="qk-task-panel qk-task__surface">
      <template #header><header ref="header" class="qk-task-panel__header qk-task-panel__header--bottom">
        <QuireButton v-if="canGoBack" variant="text" :disabled="busy" class="qk-task__target" @click="emit('back')">{{ text.back }}</QuireButton>
        <Drawer.Title class="qk-drawer__title">{{ title }}</Drawer.Title>
        <QuireIconButton :label="text.close" variant="text" :disabled="busy" class="qk-task__target" @click="close"><QuireIcon name="close" :size="16" /></QuireIconButton>
      </header></template>
      <div :aria-busy="busy || undefined"><slot /></div>
      <template v-if="$slots.footer" #footer><slot name="footer" /></template>
    </DrawerFrame>
  </Drawer.RootProvider>
</template>
<style scoped>
.qk-task-panel__header { display: flex; align-items: center; gap: var(--qk-space-inline); padding: var(--qk-space-surface-compact); }
.qk-task-panel__header > :nth-last-child(2) { flex: 1; min-width: 0; }
.qk-task-panel__body { overflow: auto; min-height: 0; padding: var(--qk-space-surface-compact); }
.qk-task-panel__footer { padding: var(--qk-space-surface-compact); }
.qk-task-panel__header--bottom > button { min-width: 44px; min-height: 44px; }
.qk-task-panel__header--bottom { padding-block: var(--qk-space-inline); }
</style>
