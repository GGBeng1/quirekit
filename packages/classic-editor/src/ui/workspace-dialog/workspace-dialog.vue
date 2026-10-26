<script setup lang="ts">
import { computed, useId } from "vue";
import { QuireDialogRoot, QuireDialogContent } from "@quirekit/ui/vue";
import type {
  ClassicEditorWorkspaceDialogProps,
  ClassicEditorWorkspaceDialogSlots
} from "./types";

const props = withDefaults(defineProps<ClassicEditorWorkspaceDialogProps>(), {
  themeRoot: undefined,
  themeVariables: () => ({}),
  size: "medium",
  busy: false,
  maskClosable: true,
  closeOnEsc: true,
  autoFocus: true,
  ownerAttributes: () => ({}),
  surfaceClass: "",
  bodyClass: ""
});
defineSlots<ClassicEditorWorkspaceDialogSlots>();
const emit = defineEmits<{
  /** @param show - Next controlled visibility requested by the modal. */
  "update:show": [show: boolean];
  /** Reports one allowed Escape request. */
  esc: [];
}>();
const dialogId = useId();
/**
 * Keeps opt-out dialogs focused on their surface instead of editing a field.
 * @returns The modal surface; default dialogs let the primitive choose a control.
 */
function resolveInitialFocus(): HTMLElement | null {
  return (props.themeRoot?.ownerDocument ?? document).getElementById(dialogId);
}
const teleportTarget = computed(() => (
  props.themeRoot?.ownerDocument.body
  ?? "body"
));

/**
 * Applies a controlled visibility request without dismissing a busy workspace.
 *
 * @param show - Visibility requested by the component library or close action.
 */
function updateVisibility(show: boolean): void {
  if (!show && props.busy) return;
  emit("update:show", show);
}

/** Reports an allowed Escape request to the workspace owner. */
function requestEscape(): void {
  if (props.busy || !props.closeOnEsc) return;
  emit("esc");
}
</script>

<template>
  <QuireDialogRoot :content-id="dialogId" :open="show" :close-on-interact-outside="maskClosable && !busy" :close-on-escape="closeOnEsc && !busy"
    :unmount-on-exit="false" v-bind="autoFocus ? {} : { initialFocusEl: resolveInitialFocus }" @update:open="updateVisibility" @escape-key-down="requestEscape">
    <QuireDialogContent v-bind="ownerAttributes" :title="title" :show-close="!busy"
      :size="size === 'wide' ? 'large' : 'medium'" :portal-target="teleportTarget" :busy="busy"
      :class="surfaceClass" :style="themeVariables">
      <div :class="bodyClass"><slot /></div>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>
