<script setup lang="ts">
import { Drawer } from "@ark-ui/vue/drawer";
import { Popover } from "@ark-ui/vue/popover";
import type { QuireKitChoicePickerProps as Props, QuireKitChoicePickerItemSlotProps, QuireKitChoiceSubmitRequest } from "../../components/choice-picker/types";
import type { QuireKitResolvedTaskPresentation, QuireKitTaskCancelReason, QuireKitTaskSearchRequest } from "../../components/task/types";
import TaskTrigger from "../shared/task/trigger.vue";
import QuireButton from "../button/button.vue";
import Content from "./content.vue";
import { useChoicePicker } from "./use-choice-picker";

/** Model requests and notifications from the one selection session. */
interface Emits {
  /** Requests a controlled open acknowledgement. */
  "update:open": [value: boolean];
  /** Reports actual session visibility. */
  openChange: [value: boolean];
  /** Reports a discarded session. */
  cancel: [details: { readonly reason: QuireKitTaskCancelReason; readonly sessionId: string }];
  /** Requests a successfully submitted controlled value. */
  "update:modelValue": [value: readonly string[]];
  /** Reports a successful business submission without executing it again. */
  commit: [request: QuireKitChoiceSubmitRequest];
  /** Reports only the current submission's failure. */
  error: [details: { readonly error: unknown; readonly request: QuireKitChoiceSubmitRequest }];
  /** Requests a complete ordinary or IME query. */
  "update:query": [value: string];
  /** Reports the latest independently cancellable query. */
  searchRequest: [request: QuireKitTaskSearchRequest];
}
/** Stable entry and non-interactive option decoration. */
interface Slots {
  /** One real button, with task ARIA and native behavior merged in place. */
  readonly trigger?: (props: { open: boolean; disabled: boolean; summary: string; presentation: QuireKitResolvedTaskPresentation | undefined }) => unknown;
  /** Replaces candidate decoration while Listbox retains option semantics. */
  readonly item?: (props: QuireKitChoicePickerItemSlotProps) => unknown;
  /** Empty result content, optionally including a host recovery action. */
  readonly empty?: () => unknown;
  /** Loading decoration without replacing the list or query input. */
  readonly loading?: () => unknown;
  /** Replaces the readable message in the single live status lane. */
  readonly status?: (props: { busy: boolean; error: string | undefined; selectedCount: number }) => unknown;
}
const {
  title, description, items, modelValue = undefined, defaultValue, selectionMode, commitMode,
  open = undefined, defaultOpen = false, disabled = false, presentation = "auto", searchable = false,
  query = undefined, defaultQuery, filter, loading = false, searchError, finalFocusEl, onCloseRequest, submit,
  confirmLabel, errorText
} = defineProps<Props>();
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const task = useChoicePicker({
  get title() { return title; }, get items() { return items; },
  get modelValue() { return modelValue; }, get defaultValue() { return defaultValue; },
  get selectionMode() { return selectionMode; }, get commitMode() { return commitMode; },
  get open() { return open; }, get defaultOpen() { return defaultOpen; }, get disabled() { return disabled; },
  get presentation() { return presentation; }, get searchable() { return searchable; },
  get query() { return query; }, get defaultQuery() { return defaultQuery; }, get filter() { return filter; },
  get finalFocusEl() { return finalFocusEl; }, get onCloseRequest() { return onCloseRequest; }, get submit() { return submit; }
}, {
  updateOpen: value => emit("update:open", value), openChange: value => emit("openChange", value), cancel: details => emit("cancel", details),
  updateValue: value => emit("update:modelValue", value), commit: request => emit("commit", request), error: details => emit("error", details),
  updateQuery: value => emit("update:query", value), search: request => emit("searchRequest", request)
});
defineExpose({ requestClose: task.lifecycle.requestClose });
</script>

<template>
  <TaskTrigger :id="task.triggerId" :disabled="disabled" :prepare="task.prepare" :get-bindings="task.getBindings" @element="task.setTrigger">
    <slot name="trigger" :open="task.lifecycle.open.value" :disabled="disabled" :summary="task.selection.summary.value" :presentation="task.presentation.resolved.value"><QuireButton>{{ task.selection.summary.value || title }}</QuireButton></slot>
  </TaskTrigger>
  <Popover.RootProvider :value="task.popover.api.value" lazy-mount unmount-on-exit @exit-complete="task.presentation.completeExit('desktop', task.presentation.epoch.value)">
    <Content v-if="task.presentation.resolved.value === 'desktop' && task.presentation.phase.value !== 'closed'" presentation="desktop"
      :title="title" :description="description" :selection="task.selection" :busy="task.requests.submitting.value" :multiple="selectionMode === 'multiple'"
      :searchable="searchable" :loading="loading" :search-error="searchError" :error-text="errorText" :confirm-label="confirmLabel"
      @close="task.lifecycle.requestClose('close-trigger')" @cancel="task.lifecycle.requestClose('cancel')">
      <template v-if="$slots.item" #item="slotProps"><slot name="item" v-bind="slotProps" /></template><template v-if="$slots.empty" #empty><slot name="empty" /></template>
      <template v-if="$slots.loading" #loading><slot name="loading" /></template><template v-if="$slots.status" #status="slotProps"><slot name="status" v-bind="slotProps" /></template>
    </Content>
  </Popover.RootProvider>
  <Drawer.RootProvider :value="task.drawer.api.value" lazy-mount unmount-on-exit @exit-complete="task.presentation.completeExit('bottom', task.presentation.epoch.value)">
    <Content v-if="task.presentation.resolved.value === 'bottom' && task.presentation.phase.value !== 'closed'" presentation="bottom"
      :title="title" :description="description" :selection="task.selection" :busy="task.requests.submitting.value" :multiple="selectionMode === 'multiple'"
      :searchable="searchable" :loading="loading" :search-error="searchError" :error-text="errorText" :confirm-label="confirmLabel"
      @close="task.lifecycle.requestClose('close-trigger')" @cancel="task.lifecycle.requestClose('cancel')">
      <template v-if="$slots.item" #item="slotProps"><slot name="item" v-bind="slotProps" /></template><template v-if="$slots.empty" #empty><slot name="empty" /></template>
      <template v-if="$slots.loading" #loading><slot name="loading" /></template><template v-if="$slots.status" #status="slotProps"><slot name="status" v-bind="slotProps" /></template>
    </Content>
  </Drawer.RootProvider>
</template>
