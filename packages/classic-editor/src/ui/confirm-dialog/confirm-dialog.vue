<script setup lang="ts">
import { QuireButton, QuireDialogRoot, QuireDialogContent } from "@quirekit/ui/vue";
import { ref, useId, watch } from "vue";
import { useClassicEditorOverlay } from "../../shell/overlays/registry";

import type { ClassicEditorConfirmDialogProps } from "./types";

const props = withDefaults(defineProps<ClassicEditorConfirmDialogProps>(), {
  busy: false,
  destructive: false,
  overlayFamily: "confirm-dialog"
});
const emit = defineEmits<{
  /** Updates the consumer-owned visibility. */
  "update:show": [show: boolean];
  /** Reports an explicit cancellation. */
  cancel: [];
  /** Reports an explicit confirmation. */
  confirm: [];
}>();
const visibility = ref(false);
const dialogId = useId();
/** @returns The confirmation surface, avoiding automatic focus on the destructive action. */
function initialFocusEl(): HTMLElement | null {
  return props.themeRoot.ownerDocument.getElementById(dialogId);
}
const overlay = useClassicEditorOverlay(
  props.overlayFamily,
  visibility,
  props.themeRoot.ownerDocument,
  { resolveRoot: () => props.themeRoot },
  { dismissOnEscape: () => false, dismissOnOutsidePointer: () => false }
);
// Publish visibility only after the coordinator has released a sibling layer.
// External show requests must register ownership before the public Dialog opens.
watch(visibility, show => {
  if (show !== props.show) emit("update:show", show);
}, { flush: "sync" });
watch(() => [props.show, props.themeRoot] as const, ([show]) => overlay.setVisible(show), {
  immediate: true,
  flush: "sync"
});
/** Closes the dialog through the shared controlled lifecycle. */
function cancel(): void {
  if (props.busy) return;
  overlay.close();
  emit("cancel");
}

/** Emits one explicit confirmation without relying on browser-native UI. */
function confirm(): void {
  if (props.busy) return;
  emit("confirm");
}

/**
 * Applies allowed visibility changes emitted by the component library.
 *
 * @param show - Next requested visibility.
 */
function updateVisibility(show: boolean): void {
  if (show) {
    overlay.setVisible(true);
    return;
  }
  cancel();
}
</script>

<template>
  <QuireDialogRoot
    :content-id="dialogId"
    :open="overlay.isVisible()"
    :initial-focus-el="initialFocusEl"
    :unmount-on-exit="false"
    :close-on-interact-outside="!busy"
    :close-on-escape="!busy"
    @update:open="updateVisibility"
  >
  <QuireDialogContent
    class="qk-classic-editor__confirm-dialog"
    :title="title"
    :portal-target="themeRoot.ownerDocument.body"
    size="small"
    :show-close="false"
    v-bind="overlay.ownerAttributes"
    :busy="busy"
  >
    <p class="qk-classic-editor__confirm-dialog-message">
      {{ message }}
    </p>
    <template #footer>
      <QuireButton
        type="button"
        :disabled="busy"
        @click="cancel"
      >
        {{ cancelLabel }}
      </QuireButton>
      <QuireButton
        type="button"
        :color="destructive ? 'danger' : 'primary'"
        :busy="busy"
        :disabled="busy"
        @click="confirm"
      >
        {{ confirmLabel }}
      </QuireButton>
    </template>
  </QuireDialogContent>
  </QuireDialogRoot>
</template>
