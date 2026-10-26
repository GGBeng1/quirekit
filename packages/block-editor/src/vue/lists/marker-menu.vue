<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import type { Editor } from "@quirekit/core";
import type { Node as DocumentNode } from "@quirekit/pm";
import { EditorUIAnchoredOverlay, type EditorUIAnchoredOverlayAnchor } from "@quirekit/editor-ui/vue";
import { QuireMenu } from "@quirekit/ui/vue";
import { blockListMarkerMenuEventName } from "../../lists/events";
import { readBlockListFeature } from "../../lists/feature";
import type { BlockListMarkerAction, BlockListMarkerMenuDetail } from "../../lists/types";
import { restoreBlockEditorFocus } from "../../ui/focus";

const { t, localize } = useBlockLocale();

const props = defineProps<{
  /** Canonical command owner. */ readonly editor: Editor;
  /** Product-owned content host receiving renderer intents. */ readonly root: HTMLElement;
  /** Current permission; revokes the open target when changed. */ readonly editable: boolean;
}>();
const target = shallowRef<HTMLElement | null>(null);
const actions = shallowRef<readonly BlockListMarkerAction[]>([]);
const anchor = shallowRef<EditorUIAnchoredOverlayAnchor | null>(null);
let revision: DocumentNode | null = null;
const items = computed(() => actions.value.map(action => ({ value: action.id, label: action.label, disabled: action.disabled })));

/** @returns Current marker bounds only on opening or layout resize, never on scrolling. */
function resolveAnchor(): EditorUIAnchoredOverlayAnchor | null {
  if (!target.value?.isConnected) return null;
  const rect = target.value.getBoundingClientRect();
  return { x: rect.left, y: rect.bottom, rects: [{ x: rect.left, y: rect.top, width: rect.width, height: rect.height }] };
}
/** @param focus - Returns focus only when the public menu finishes dismissal. */
function close(focus = false): void {
  target.value = null; actions.value = []; anchor.value = null; revision = null;
  props.editor.off("update", changed); props.editor.off("selectionUpdate", changed); props.editor.off("unmount", changed);
  if (focus) restoreBlockEditorFocus(props.editor);
}
/** @param event - Exact live paragraph identity from the optional list renderer. */
function open(event: Event): void {
  if (!props.editable || !(event.target instanceof HTMLElement) || !props.root.contains(event.target)) return;
  const position = (event as CustomEvent<BlockListMarkerMenuDetail>).detail?.position;
  const doc = props.editor.state.doc;
  if (!Number.isInteger(position) || position < 0 || position >= doc.content.size) return;
  const node = doc.nodeAt(position);
  const next = readBlockListFeature(props.editor)?.markerActions?.(props.editor, position) ?? [];
  if (!node?.isTextblock || !next.length) return;
  close();
  // Resolve the clicked paragraph before opening. Menu actions retain that document
  // identity and never accidentally operate on a later caret or collaborator edit.
  props.editor.commands.setNodeSelection(position);
  target.value = event.target; actions.value = next; revision = props.editor.state.doc;
  anchor.value = resolveAnchor();
  props.editor.on("update", changed); props.editor.on("selectionUpdate", changed); props.editor.on("unmount", changed);
}
/** @param id - Shared canonical action identity chosen by the user. */
function execute(id: string): void {
  const action = actions.value.find(item => item.id === id);
  if (!action || action.disabled || !props.editor.isEditable || props.editor.state.doc !== revision) { close(); return; }
  action.execute(); close(true);
}
/** Releases stale exact-position leases after content, selection or mount changes. */
function changed(): void { if (target.value) close(); }
watch(() => props.editable, changed);
onMounted(() => {
  props.root.addEventListener(blockListMarkerMenuEventName, open);
});
onBeforeUnmount(() => {
  props.root.removeEventListener(blockListMarkerMenuEventName, open);
  close();
});
</script>

<template>
  <EditorUIAnchoredOverlay :show="!!target" :anchor="anchor" :resolve-anchor="resolveAnchor" placement="bottom-start">
    <QuireMenu :open="true" :portalled="false" :positioned="false" :items="localize(items)" :aria-label="t('列表操作')" width="208px"
      @select="execute" @update:open="!$event && close(true)" />
  </EditorUIAnchoredOverlay>
</template>
