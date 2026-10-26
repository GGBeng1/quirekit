<script setup lang="ts">
import { computed, inject, shallowRef } from "vue";
import type { EditorState } from "@quirekit/cm-state";
import type { MsfeEditor } from "@quirekit/msfe-core";
import type { QuireKitToolbarExecuteEvent } from "@quirekit/ui";
import { QuireImagePreview, QuireToolbar } from "@quirekit/ui/vue";
import { useMdDocumentLayer, useMdOverlayTarget } from "../overlays/context";
import { mdImageEditKey, mdPreviewEditKey } from "../context";
import { mdEditorMessages } from "../messages";
import type { MdEditorLocale } from "../types";
import { useMdObjectSelection } from "./selection";
import { EditorView } from "@quirekit/cm-view";
import type { MsfeSourceRange } from "@quirekit/msfe-core";
import { mdObjectFileName, readMdObjectFacts } from "./resolve";
import { collectMdObjectGallery, renderMdGalleryDiagrams } from "./gallery";
import type { MdObjectGallery } from "./types";
import { downloadMdObject, editMdObject, mdObjectActions, removeMdObject } from "./actions";
const props = defineProps<{
  /** Canonical source owner. */ editor: MsfeEditor;
  /** Accepted state, for permission changes. */ state: EditorState;
  /** Control language. */ locale: MdEditorLocale;
  /** Whether no other product task owns the surface. */ enabled: boolean;
  /** @returns Height of sticky chrome above the document, where the action bar docks. */ stickyTop: () => number;
}>();
const portal = useMdOverlayTarget(), layer = useMdDocumentLayer(), editImage = inject(mdImageEditKey, undefined), editPreview = inject(mdPreviewEditKey, undefined);
const text = computed(() => mdEditorMessages[props.locale]);
const gallery = shallowRef<MdObjectGallery | null>(null), galleryIndex = shallowRef(0), previewOpen = computed(() => !!gallery.value);
let rendering: AbortController | null = null;
let returnFocus: HTMLElement | null = null;
/** @returns The object that opened the preview, while it is still mounted. */
function restoreFocus(): HTMLElement | null { return returnFocus?.isConnected ? returnFocus : null; }
const objects = useMdObjectSelection({ editor: () => props.editor, overlay: () => portal.value, enabled: () => props.enabled,
  layer: () => layer.value, keydown, activate: () => preview(), preview: (root, range) => preview(root, range) });
const readOnly = computed(() => props.state.readOnly || props.editor.mode === "locked");
const facts = computed(() => {
  void objects.revision.value;
  const current = objects.selected.value, range = current?.anchor.getRange();
  return current && range ? readMdObjectFacts(props.editor, current.kind, range, current.element) : null;
});
const items = computed(() => objects.selected.value && facts.value ? mdObjectActions(objects.selected.value.kind, facts.value, readOnly.value, text.value) : []);
/** Room above the object for the action bar and its gap. */
const barSpace = 44;
const ring = computed(() => {
  const rect = objects.rect.value;
  return rect && { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` };
});
// The dock spans the bar's slot plus the object; the sticky bar inside it stays under the toolbar
// while the object is partly visible and leaves with it, all in browser layout without scroll work.
const dock = computed(() => {
  const rect = objects.rect.value;
  return rect && { left: `${rect.left}px`, top: `${rect.top - barSpace}px`, width: `${rect.width}px`, height: `${rect.height + barSpace}px` };
});
/**
 * Opens the shared preview over every image and diagram in the document, starting at this object.
 * @param root - Element that receives focus when the preview closes.
 * @param range - Opening object; defaults to the selection.
 */
function preview(root = objects.selected.value?.element, range: MsfeSourceRange | null | undefined = objects.selected.value?.anchor.getRange()): void {
  const view = EditorView.findFromDOM(props.editor.element);
  if (!view || !range) return;
  const next = collectMdObjectGallery(view, props.editor, range, text.value.loadingPreview);
  if (!next.items.length) return;
  returnFocus = root ?? null; gallery.value = next; galleryIndex.value = next.index;
  rendering?.abort(); rendering = new AbortController();
  const signal = rendering.signal;
  void renderMdGalleryDiagrams(view, next.pending, signal, (id, src) => {
    const current = gallery.value;
    if (current && !signal.aborted) gallery.value = { ...current, items: current.items.map(item => item.id === id ? { ...item, src } : item) };
  });
}
/** @param open - Preview visibility requested by the shared component. */
function closeGallery(open: boolean): void {
  if (open) return;
  rendering?.abort(); rendering = null; gallery.value = null;
}

/** @param cut - Remove after the source reaches the clipboard. */
async function copy(cut = false): Promise<void> {
  const current = objects.selected.value, range = current?.anchor.getRange();
  if (!current || !range) return;
  try { await navigator.clipboard.writeText(props.editor.state.sliceDoc(range.from, range.to)); } catch { return; }
  if (cut) remove(true);
}
/** @param cut - Record the removal as a cut. */
function remove(cut = false): void {
  const current = objects.selected.value, range = current?.anchor.getRange();
  if (!current || !range || readOnly.value) return;
  const command = removeMdObject(current.kind, range, cut);
  objects.clear();
  if (props.editor.run(command).ok) props.editor.focus();
}
/** @param rename - Open the whiteboard title task. */
function edit(rename = false): void {
  const current = objects.selected.value, range = current?.anchor.getRange();
  if (!current || !range || readOnly.value) return;
  // The dialog restores focus to its opener; hand it the text rather than the unmounting action bar.
  objects.clear(true);
  if (current.kind === "image") editImage?.(range);
  else if (current.kind === "mermaid" || current.kind === "textDiagram" || current.kind === "math")
    editPreview?.({ editor: props.editor, range, kind: current.kind === "math" ? "displayMath" : current.kind });
  else editMdObject(props.editor, current.kind, range, rename);
}
/** @param event - Toolbar intent. */
function execute(event: QuireKitToolbarExecuteEvent): void {
  if (event.value === "edit" || event.value === "rename") edit(event.value === "rename");
  else if (event.value === "preview") preview();
  else if (event.value === "download" && facts.value?.src) downloadMdObject(props.editor.element.ownerDocument, facts.value.src, mdObjectFileName(facts.value.title, facts.value.format));
  else if (event.value === "copy" || event.value === "cut") void copy(event.value === "cut");
  else if (event.value === "delete") remove();
}
/** @param event - Key pressed while the object holds focus. */
function keydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  const mod = event.metaKey || event.ctrlKey, key = event.key.toLowerCase();
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    if (mod || event.altKey || event.shiftKey || !objects.moveCaret(event.key === "ArrowLeft" ? -1 : 1)) return;
  } else if (event.key === "Escape") objects.clear(true);
  else if (event.key === "Delete" || event.key === "Backspace") remove();
  else if (mod && (key === "c" || key === "x")) void copy(key === "x");
  else if (event.key === "Enter" && objects.selected.value?.kind === "image") preview();
  else return;
  event.preventDefault(); event.stopPropagation();
}
</script>
<template>
  <template v-if="objects.selected.value">
    <div v-if="ring" class="md-object-selection" data-md-object-selection :style="ring" />
    <div v-if="dock && !previewOpen" class="md-object-dock" :style="dock">
      <div class="md-object-actions" data-md-object-actions :style="{ top: `${stickyTop() + 8}px` }">
        <QuireToolbar :label="text.objectActions" :items="items" variant="plain" preserve-focus @execute="execute" />
      </div>
    </div>
  </template>
  <!-- Mounted only while open, so removing an object never restores focus to a detached root. -->
  <QuireImagePreview v-if="gallery" v-model:index="galleryIndex" :open="true" :items="gallery.items" :portal-target="portal ?? undefined"
    :final-focus-el="restoreFocus" @update:open="closeGallery" />
</template>
<style scoped>
.md-object-selection { position: absolute; z-index: 2; pointer-events: none; box-sizing: border-box; border: 2px solid var(--qk-color-action-primary); border-radius: var(--qk-radius-group); }
.md-object-dock { position: absolute; z-index: 4; display: flex; justify-content: center; align-items: flex-start; pointer-events: none; }
.md-object-actions { position: sticky; padding: 2px; pointer-events: auto; border-radius: var(--qk-radius-group); background: var(--qk-color-surface-raised); box-shadow: var(--qk-elevation-overlay); }
</style>
