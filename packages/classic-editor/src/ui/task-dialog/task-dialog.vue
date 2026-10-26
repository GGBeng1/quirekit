<script setup lang="ts">
import { useId } from "vue";
import { QuireDialogRoot, QuireDialogContent } from "@quirekit/ui/vue";
import type {
  ClassicEditorTaskDialogProps,
  ClassicEditorTaskDialogSlots
} from "./types";

const props = withDefaults(defineProps<ClassicEditorTaskDialogProps>(), {
  size: "medium",
  tone: "default",
  form: false,
  busy: false,
  maskClosable: true,
  closeOnEsc: true,
  autoFocus: false,
  ownerAttributes: () => ({}),
  surfaceClass: "",
  bodyClass: ""
});
defineSlots<ClassicEditorTaskDialogSlots>();
const emit = defineEmits<{
  /** @param show - Next controlled visibility requested by the modal. */
  "update:show": [show: boolean];
  /** Reports one allowed Escape request. */
  esc: [];
  /** Reports one form submission from the shared surface. */
  submit: [];
}>();
const dialogId = useId();
/**
 * Focuses the task surface when automatic field focus is disabled.
 * @returns The mounted dialog surface.
 */
function resolveInitialFocus(): HTMLElement | null {
  return props.themeRoot.ownerDocument.getElementById(dialogId);
}

/**
 * Applies a controlled visibility request without dismissing a busy task.
 *
 * @param show - Visibility requested by the component library.
 */
function updateVisibility(show: boolean): void {
  if (!show && props.busy) return;
  emit("update:show", show);
}

/** Reports an allowed Escape request to the task owner. */
function requestEscape(): void {
  if (props.busy || !props.closeOnEsc) return;
  emit("esc");
}

/** Reports submission from a form-backed task surface. */
function submit(): void {
  if (props.busy || !props.form) return;
  emit("submit");
}
</script>

<template>
  <QuireDialogRoot :content-id="dialogId" :open="show" :close-on-interact-outside="maskClosable && !busy"
    :close-on-escape="closeOnEsc && !busy" :unmount-on-exit="false"
    v-bind="initialFocusEl ? { initialFocusEl } : autoFocus ? {} : { initialFocusEl: resolveInitialFocus }"
    @update:open="updateVisibility" @escape-key-down="requestEscape">
    <QuireDialogContent v-bind="ownerAttributes" :title="title" :size="size"
      :portal-target="themeRoot.ownerDocument.body" :show-close="false" :busy="busy"
      :class="surfaceClass" :data-tone="tone" :as="form ? 'form' : 'div'" @submit.prevent="submit">
      <div :class="bodyClass"><slot /></div>
      <template v-if="$slots.actions" #footer><slot name="actions" /></template>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>
