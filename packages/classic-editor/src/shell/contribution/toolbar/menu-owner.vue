<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import { useClassicEditorOverlay, type ClassicEditorOverlayController } from "../../overlays/registry";
import type { ClassicEditorShellModel } from "../../types";
const props = defineProps<{
  /** Stable contribution group owning the menu. */
  groupId: string;
  /** Latest mounted instance and locale. */
  model: ClassicEditorShellModel;
}>();
const emit = defineEmits<{
  /** Publishes one stable instance coordinator for the public menu entry. */
  register: [groupId: string, owner: ClassicEditorOverlayController];
  /** Releases that exact coordinator when the group leaves the composition. */
  release: [groupId: string, owner: ClassicEditorOverlayController];
}>();
const owner = useClassicEditorOverlay("ribbon-menu", undefined, undefined,
  { resolveRoot: () => props.model.context?.root },
  { dismissOnEscape: () => false, dismissOnOutsidePointer: () => false });
emit("register", props.groupId, owner);
onBeforeUnmount(() => emit("release", props.groupId, owner));
</script>

<template />
