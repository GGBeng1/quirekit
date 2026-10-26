<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import type { ClassicEditorRenderContext } from "../../../../types";
import { useClassicEditorOverlay, type ClassicEditorOverlayController } from "../../../overlays/registry";
import type { ClassicToolbarPopupEntry } from "./types";
const props = defineProps<{
  /** Original entry and stable feature-local path. */
  entry: ClassicToolbarPopupEntry;
  /** Latest mounted instance root and locale. */
  context: ClassicEditorRenderContext;
  /** Active selection Toolbar parent; ordinary Ribbon popups remain root surfaces. */
  parentId?: string | undefined;
}>();
const emit = defineEmits<{
  /** Publishes the exact owner for this mounted entry. */
  register: [key: string, owner: ClassicEditorOverlayController];
  /** Releases this entry's owner on removal. */
  release: [key: string, owner: ClassicEditorOverlayController];
  /** Reports admitted visibility to the original business controller. */
  visible: [entry: ClassicToolbarPopupEntry, visible: boolean];
}>();
const visible = ref(false);
const owner = useClassicEditorOverlay("ribbon-feature", visible, undefined,
  { resolveRoot: () => props.context.root },
  { dismissOnEscape: () => false, dismissOnOutsidePointer: () => false, resolveParentId: () => props.parentId });
watch(visible, value => emit("visible", props.entry, value), { flush: "sync" });
// Business commits may close a retained surface directly. Opening still passes
// through the same admission boundary as native Toolbar activation.
watch(() => props.entry.item.expanded, value => {
  if (value !== undefined && value !== visible.value) owner.setVisible(value);
}, { immediate: true });
emit("register", props.entry.key, owner);
onBeforeUnmount(() => emit("release", props.entry.key, owner));
</script>

<template />
