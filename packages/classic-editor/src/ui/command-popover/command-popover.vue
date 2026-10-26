<script setup lang="ts">
import { computed, watch } from "vue";
import { useClassicEditorOverlay } from "../../shell/overlays/registry";
import {
  QuirePopoverAnchor,
  QuirePopoverContent,
  QuirePopoverRoot,
  QuirePopoverTrigger
} from "@quirekit/ui/vue";
import type {
  ClassicEditorCommandPopoverProps,
  ClassicEditorCommandPopoverSlots
} from "./types";

const props = withDefaults(defineProps<ClassicEditorCommandPopoverProps>(), {
  themeRoot: undefined,
  placement: "bottom-start",
  padding: "regular",
  disabled: false,
  anchorOnly: false,
  overlayFamily: undefined,
  role: undefined,
  label: undefined,
  surfaceClass: undefined
});
defineSlots<ClassicEditorCommandPopoverSlots>();
const emit = defineEmits<{
  /** Updates consumer-owned controlled visibility. */
  "update:show": [show: boolean];
  /** Reports a component-library outside-pointer request. */
  clickoutside: [];
}>();
let synchronizingOverlay = false;
const coordinated = computed(() => props.overlayFamily !== undefined);
const controlledVisibility = computed({
  get: () => props.show,
  set: (show: boolean) => {
    if (!synchronizingOverlay) emit("update:show", show);
  }
});
const overlay = useClassicEditorOverlay(
  props.overlayFamily ?? "command-popover",
  controlledVisibility,
  props.themeRoot?.ownerDocument,
  { resolveRoot: () => props.themeRoot },
  { dismissOnEscape: () => false, dismissOnOutsidePointer: () => false }
);
const ownerAttributes = computed(() => (
  coordinated.value ? overlay.ownerAttributes : undefined
));
const teleportTarget = computed(() => (
  props.themeRoot?.ownerDocument.body ?? "body"
));

/**
 * Forwards a visibility request through the optional overlay coordinator.
 *
 * @param show - Requested controlled visibility.
 */
function requestVisibility(show: boolean): void {
  if (show && props.disabled) return;
  if (coordinated.value) {
    overlay.setVisible(show);
    return;
  }
  emit("update:show", show);
}

watch(
  [
    () => props.show,
    () => props.themeRoot
  ],
  ([show]) => {
    if (!coordinated.value) return;
    synchronizingOverlay = true;
    overlay.setVisible(show);
    synchronizingOverlay = false;
  },
  {
    flush: "sync",
    immediate: true
  }
);
</script>

<template>
  <QuirePopoverRoot :open="show && !disabled" :placement="placement"
    @update:open="requestVisibility" @interact-outside="emit('clickoutside')">
    <QuirePopoverAnchor
      v-if="anchorOnly"
      :as-child="false"
      v-bind="ownerAttributes"
      role="none"
      style="display: block; width: 100%"
    >
      <slot name="trigger" />
    </QuirePopoverAnchor>
    <QuirePopoverTrigger v-else as-child v-bind="ownerAttributes">
      <slot name="trigger" />
    </QuirePopoverTrigger>
    <QuirePopoverContent v-if="show && !disabled" v-bind="ownerAttributes" :portal-target="teleportTarget" :show-arrow="false"
      border="subtle" class="qk-classic-editor__command-popover" data-qk-command-popover-shell=""
      style="padding: 0" :aria-label="label">
      <div v-bind="ownerAttributes" class="qk-classic-editor__command-popover-surface" :class="surfaceClass"
        :data-padding="padding" :role="role" :aria-label="label" @pointerdown.stop><slot /></div>
    </QuirePopoverContent>
  </QuirePopoverRoot>
</template>
