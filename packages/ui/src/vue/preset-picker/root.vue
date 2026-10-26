<script setup lang="ts">
import { Drawer } from "@ark-ui/vue/drawer";
import { Popover } from "@ark-ui/vue/popover";
import type { QuireKitPresetPickerProps as Props, QuireKitPresetSubmitRequest } from "../../components/preset-picker/types";
import type { QuireKitPresetGalleryItemSlotProps } from "../../components/preset-gallery/types";
import type { QuireKitResolvedTaskPresentation, QuireKitTaskCancelReason } from "../../components/task/types";
import TaskTrigger from "../shared/task/trigger.vue";
import QuireButton from "../button/button.vue";
import Content from "./content.vue";
import { usePresetPicker } from "./use-preset-picker";

/** Single-value model requests and notifications from the active task. */
interface Emits {
  /** Requests controlled opening acknowledgement. */
  "update:open": [value: boolean];
  /** Reports effective session visibility. */
  openChange: [value: boolean];
  /** Reports a discarded uncommitted session. */
  cancel: [details: { readonly reason: QuireKitTaskCancelReason; readonly sessionId: string }];
  /** Requests a successfully submitted single-preset model update. */
  "update:modelValue": [value: string | null];
  /** Reports successful completion of the sole submit callback. */
  commit: [request: QuireKitPresetSubmitRequest];
  /** Reports the current submission failure and its snapshot. */
  error: [details: { readonly error: unknown; readonly request: QuireKitPresetSubmitRequest }];
}
/** Stable entry and existing Gallery decoration slots. */
interface Slots {
  /** One real button whose identity, ARIA and behavior are merged in place. */
  readonly trigger?: (props: { open: boolean; disabled: boolean; summary: string; presentation: QuireKitResolvedTaskPresentation | undefined }) => unknown;
  /** Decorative preview using the same item and state as PresetGallery. */
  readonly preview?: (props: QuireKitPresetGalleryItemSlotProps) => unknown;
  /** Custom content for an empty Gallery. */
  readonly empty?: () => unknown;
}
const props = withDefaults(defineProps<Props>(), {
  open: undefined, modelValue: undefined, defaultOpen: false, disabled: false,
  presentation: "auto", commitMode: "explicit", maxColumns: 4
});
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const task = usePresetPicker(props, {
  updateOpen: value => emit("update:open", value), openChange: value => emit("openChange", value), cancel: details => emit("cancel", details),
  updateValue: value => emit("update:modelValue", value), commit: request => emit("commit", request), error: details => emit("error", details)
});
defineExpose({ requestClose: task.lifecycle.requestClose });
</script>

<template>
  <TaskTrigger :id="task.triggerId" :disabled="disabled" :prepare="task.prepare" :get-bindings="task.getBindings" @element="task.setTrigger">
    <slot name="trigger" :open="task.lifecycle.open.value" :disabled="disabled" :summary="task.selection.summary.value" :presentation="task.presentation.resolved.value"><QuireButton>{{ task.selection.summary.value || title }}</QuireButton></slot>
  </TaskTrigger>
  <Popover.RootProvider :value="task.popover.api.value" lazy-mount unmount-on-exit @exit-complete="task.presentation.completeExit('desktop', task.presentation.epoch.value)">
    <Content v-if="task.presentation.resolved.value === 'desktop' && task.presentation.phase.value !== 'closed'" presentation="desktop"
      :title="title" :description="description" :selection="task.selection" :busy="task.requests.submitting.value"
      :max-columns="maxColumns" :min-item-width="minItemWidth" :error-text="errorText" :confirm-label="confirmLabel"
      @close="task.lifecycle.requestClose('close-trigger')" @cancel="task.lifecycle.requestClose('cancel')">
      <template v-if="$slots.preview" #preview="slotProps"><slot name="preview" v-bind="slotProps" /></template><template v-if="$slots.empty" #empty><slot name="empty" /></template>
    </Content>
  </Popover.RootProvider>
  <Drawer.RootProvider :value="task.drawer.api.value" lazy-mount unmount-on-exit @exit-complete="task.presentation.completeExit('bottom', task.presentation.epoch.value)">
    <Content v-if="task.presentation.resolved.value === 'bottom' && task.presentation.phase.value !== 'closed'" presentation="bottom"
      :title="title" :description="description" :selection="task.selection" :busy="task.requests.submitting.value"
      :max-columns="maxColumns" :min-item-width="minItemWidth" :error-text="errorText" :confirm-label="confirmLabel"
      @close="task.lifecycle.requestClose('close-trigger')" @cancel="task.lifecycle.requestClose('cancel')">
      <template v-if="$slots.preview" #preview="slotProps"><slot name="preview" v-bind="slotProps" /></template><template v-if="$slots.empty" #empty><slot name="empty" /></template>
    </Content>
  </Drawer.RootProvider>
</template>
