<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { EditorUIAnchoredOverlay, type EditorUIAnchoredOverlayAnchor } from "@quirekit/editor-ui/vue";
import { TextSelection } from "@quirekit/pm";
import { useBlockFontScope } from "./fonts/state";
import type { BlockToolbarProps } from "../types";
import BlockToolbar from "./toolbar.vue";
import { useBlockLinkScope } from "../links/state";
const props = defineProps<BlockToolbarProps & { viewport: HTMLElement }>();
const emit = defineEmits<{ feedback: [message: string] }>();
const open = ref(false), anchor = shallowRef<EditorUIAnchoredOverlayAnchor | null>(null);
const { dialog } = useBlockFontScope(props.editor);
const { target: linkTarget } = useBlockLinkScope(props.editor);
let dragging = false, frame: number | undefined;
let dismissed: unknown = null;
/** Uses two public caret rectangles after pointer release; dragging never causes popup layout work. */
function sync(): void {
  frame = undefined;
  const selection = props.editor.state.pm.selection;
  if (dragging || dialog.value || linkTarget.value || !props.editor.isEditable || selection === dismissed || !(selection instanceof TextSelection) || selection.empty || selection.$from.parent.type.name === "codeBlock") { open.value = false; return; }
  for (let depth = 1; depth <= selection.$from.depth; depth++) if (selection.$from.node(depth).type.name === "wordTable") { open.value = false; return; }
  const start = props.editor.view.coordsAtPos(selection.from), end = props.editor.view.coordsAtPos(selection.to);
  const left = Math.min(start.left, end.left), top = Math.min(start.top, end.top);
  anchor.value = { x: left, y: top, rects: [{ x: left, y: top, width: Math.abs(end.right - start.left), height: Math.max(start.bottom, end.bottom) - top }] };
  open.value = true;
}
/** Schedules at most one layout read for the latest completed selection. */
function schedule(): void { if (!dragging && frame === undefined) frame = requestAnimationFrame(sync); }
/** Keeps selection tracking unobstructed until the pointer is released. */
function press(event: PointerEvent): void { if (!(event.target instanceof Element) || !event.target.closest(".qk-block-editor__content")) return; dragging = true; open.value = false; }
/** Releases pointer suppression after View has committed the final selection. */
function release(): void { if (!dragging) return; dragging = false; schedule(); }
/** Explicit dismissal lasts until the selection changes. */
function close(): void { dismissed = props.editor.state.pm.selection; open.value = false; }
/** @param event - Escape dismisses only after nested controls have had their turn. */
function key(event: KeyboardEvent): void { if (event.key === "Escape" && !event.defaultPrevented) close(); }
watch(dialog, value => { if (value) close(); });
watch(linkTarget, value => { if (value) close(); });
onMounted(() => {
  props.editor.on("selectionUpdate", schedule); props.editor.on("update", schedule); props.editor.on("focus", schedule);
  props.viewport.addEventListener("pointerdown", press); window.addEventListener("pointerup", release); window.addEventListener("pointercancel", release);
  window.addEventListener("keydown", key);
});
onBeforeUnmount(() => {
  props.editor.off("selectionUpdate", schedule); props.editor.off("update", schedule); props.editor.off("focus", schedule);
  props.viewport.removeEventListener("pointerdown", press); window.removeEventListener("pointerup", release); window.removeEventListener("pointercancel", release);
  if (frame !== undefined) cancelAnimationFrame(frame);
  window.removeEventListener("keydown", key);
});
</script>
<template>
  <EditorUIAnchoredOverlay :show="open" :anchor="anchor" placement="top-start" layer="chrome" :resolve-anchor="() => { sync(); return anchor; }">
    <div data-block-selection-toolbar @pointerdown.stop>
      <BlockToolbar :editor="editor" :format="format" :editable="editable" :undo="undo" :redo="redo" selection @feedback="emit('feedback', $event)" />
    </div>
  </EditorUIAnchoredOverlay>
</template>
