<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, onBeforeUnmount, onMounted, shallowRef, ref, nextTick } from "vue";
import type { Editor } from "@quirekit/core";
import { QuirePopoverRoot, QuirePopoverAnchor, QuirePopoverContent, type QuireKitCommandListHandle } from "@quirekit/ui/vue";
import { useEditorUIOverlayHost } from "@quirekit/editor-ui/vue";
import { readSlashTarget } from "../../ui/insert/execute";
import type { BlockSlashTarget } from "../../ui/insert/types";
import BlockInsertList from "./list.vue";
import { BLOCK_INSERT_MENU_WIDTH } from "./layout";

const { t } = useBlockLocale();

const props = defineProps<{
  /** Canonical document session. */ editor: Editor;
  /** Mounted editor input boundary. */ root: HTMLElement;
}>();
const overlay = useEditorUIOverlayHost();
const target = shallowRef<BlockSlashTarget | null>(null);
const focusOwner = shallowRef<HTMLElement | null>(null);
const anchor = shallowRef<{ x: number; y: number } | null>(null);
const open = computed(() => !!target.value && !!anchor.value);
const list = ref<QuireKitCommandListHandle>();
let dismissed: BlockSlashTarget | null = null;
let composing = false;
let releaseGeometry: (() => void) | undefined;
/** Reads at most 65 source characters and positions with the public View client coordinates. */
function sync(): void {
  if (composing) return;
  const next = readSlashTarget(props.editor);
  if (!next || (dismissed?.doc === next.doc && dismissed.from === next.from)) { target.value = null; return; }
  if (target.value?.doc === next.doc && target.value.from === next.from) return;
  const input = props.root.ownerDocument.activeElement;
  if (!(input instanceof HTMLElement) || !props.root.contains(input)) { target.value = null; return; }
  focusOwner.value = input;
  target.value = next;
}
/** Reads geometry only after the mounted View has accepted the current document. */
function project(): void {
  if (!target.value || props.editor.isDestroyed) return;
  const coords = props.editor.view.coordsAtPos(props.editor.state.pm.selection.from);
  anchor.value = { x: coords.left, y: coords.bottom };
}
/** Rebinds frame completion when the host replaces its mounted view. */
function bindGeometry(): void { releaseGeometry?.(); releaseGeometry = props.editor.mountedView?.onGeometryUpdate?.(project); }
/** Releases geometry and suggestions before the mounted input owner disappears. */
function unmount(): void { releaseGeometry?.(); releaseGeometry = undefined; target.value = null; anchor.value = null; }
/** Explicit cancellation preserves trigger text until the user changes it. */
function close(): void { dismissed = target.value; target.value = null; }
/** @param event - Root-captured native input before View keyboard handling. */
function keydown(event: KeyboardEvent): void {
  if (!open.value || composing || event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
  if (list.value?.handleKeydown(event)) event.stopPropagation();
}
/** Suppresses preedit queries and acceptance. */
function compositionStart(): void { composing = true; }
/** Restarts only after the final committed editor transaction has settled. */
function compositionEnd(): void { composing = false; void nextTick(sync); }
onMounted(() => {
  bindGeometry();
  props.editor.on("mount", bindGeometry); props.editor.on("unmount", unmount);
  props.editor.on("transaction", sync);
  props.root.addEventListener("keydown", keydown, true);
  props.root.addEventListener("compositionstart", compositionStart, true);
  props.root.addEventListener("compositionend", compositionEnd, true);
});
onBeforeUnmount(() => {
  unmount(); props.editor.off("mount", bindGeometry); props.editor.off("unmount", unmount);
  props.editor.off("transaction", sync);
  props.root.removeEventListener("keydown", keydown, true);
  props.root.removeEventListener("compositionstart", compositionStart, true);
  props.root.removeEventListener("compositionend", compositionEnd, true);
});
</script>
<template>
  <QuirePopoverRoot v-if="open && target && anchor" :open="true" :auto-focus="false" :restore-focus="false" placement="bottom-start" @update:open="!$event && close()">
    <QuirePopoverAnchor><span aria-hidden="true" class="qk-block-slash-anchor" :style="{ left: `${anchor.x}px`, top: `${anchor.y}px` }" /></QuirePopoverAnchor>
    <QuirePopoverContent :portal-target="overlay?.host.value ?? 'body'" :width="BLOCK_INSERT_MENU_WIDTH" :show-arrow="false" padding="none" border="subtle" :aria-label="t('斜杠插入菜单')">
      <BlockInsertList ref="list" :editor="editor" :slash-target="target" :focus-owner="focusOwner" :query="target.text.slice(1)" @close="close" />
    </QuirePopoverContent>
  </QuirePopoverRoot>
</template>
