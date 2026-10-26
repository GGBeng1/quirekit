<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, ref, shallowRef, toRef, onMounted, onBeforeUnmount } from "vue";
import type { Editor } from "@quirekit/core";
import { EditorUIAnchoredOverlay, EditorUIObjectFrame, EditorUIObjectToolbar, useEditorUIOverlayHost } from "@quirekit/editor-ui/vue";
import { openTextDiagram } from "@quirekit/extension-text-diagram";
import { openFlowchart } from "@quirekit/extension-flowchart";
import { openMindMap } from "@quirekit/extension-mind-map";
import { openWhiteboard } from "@quirekit/extension-whiteboard";
import { openBlockTextDiagramDialog } from "../../text-diagram/open";
import { openBlockFlowchartDialog } from "../../flowchart/open";
import { openBlockMindMapDialog } from "../../mind-map/open";
import { openBlockWhiteboardDialog } from "../../whiteboard/open";
import { useBlockMediaContext } from "./context";
import { blockMediaToolbarItems } from "./catalog";
import { defaultMediaPresentation, readMediaPresentation } from "../../media/presentation";
import { updateBlockMedia, mediaTargetCurrent } from "../../media/commands";
import { chooseBlockImage } from "../../media/files";
import type { BlockMediaTarget } from "../../media/types";
import MediaDialog from "./dialog.vue";
import { registerMediaMenu } from "./menu";
import { collectBlockMediaGallery } from "./gallery/items";
import type { BlockMediaGallery } from "./gallery/types";
import MediaPreview from "./gallery/preview.vue";
import { registerBlockMediaPreview } from "../../media/preview";
import { releaseBlockObjectToolbar, useBlockObjectToolbarOwner } from "../objects/ownership";

const { t, localize } = useBlockLocale();
const props = defineProps<{ /** Document session. */ editor: Editor; /** Current editing policy. */ editable: boolean; /** Clipping owner. */ viewport: HTMLElement }>();
const { target, frame, maximumWidth } = useBlockMediaContext(props.editor, toRef(props, "viewport"));
const overlay = useEditorUIOverlayHost();
const media = computed(() => readMediaPresentation(target.value?.node.attrs.media));
const items = computed(() => {
 const root = frame.value && target.value ? props.editor.view.nodeDOM?.(target.value.pos) as HTMLElement | null : null;
 const actions = blockMediaToolbarItems(target.value?.node.type.name === "image", !!media.value.href, !!root?.querySelector("img")?.getAttribute("src")?.trim());
 return props.editable ? actions : actions.filter(item => item.value === "preview");
});
const gallery = shallowRef<BlockMediaGallery | null>(null);
const objectOwner = useBlockObjectToolbarOwner(props.editor);
const releasePreview = registerBlockMediaPreview(props.editor, position => { gallery.value = collectBlockMediaGallery(props.editor, position); });
onBeforeUnmount(releasePreview);
/** @param event - Returning focus or pointer to the selected image restores its own tools. */
function activate(event: Event): void {
 const other = objectOwner.value, current = target.value;
 if (other && current && event.target instanceof Node && props.editor.view.nodeDOM?.(current.pos)?.contains(event.target)) releaseBlockObjectToolbar(props.editor, other);
}
onMounted(() => { props.viewport.addEventListener("focusin", activate); props.viewport.addEventListener("pointerover", activate); });
onBeforeUnmount(() => { props.viewport.removeEventListener("focusin", activate); props.viewport.removeEventListener("pointerover", activate); });
const dialog = ref(""), dialogTarget = shallowRef<BlockMediaTarget | null>(null), source = ref("");
const dimensions = ref({ width: 0, height: 0 });
const anchor = computed(() => { const rect = frame.value?.rect; return rect ? { x: rect.x, y: rect.y, rects: [rect] } : null; });
const releaseMenu = registerMediaMenu(props.editor, execute);
onBeforeUnmount(releaseMenu);
/** @param value - Shared object-toolbar intent; every write validates the current atom. */
function execute(value: string): void {
 const current = target.value, rect = frame.value?.rect;
 if (!current || !rect || current.doc !== props.editor.state.doc) return;
 if (value === "preview") { gallery.value = collectBlockMediaGallery(props.editor, current.pos); return; }
 if (!mediaTargetCurrent(props.editor, current)) return;
 if (value === "edit") {
  const type = current.node.type.name;
  if (type === "textDiagram") openTextDiagram(props.editor, openBlockTextDiagramDialog, current.pos);
  if (type === "flowchart") openFlowchart(props.editor, openBlockFlowchartDialog, current.pos);
  if (type === "mindMap") openMindMap(props.editor, openBlockMindMapDialog, current.pos);
  if (type === "whiteboard") openWhiteboard(props.editor, openBlockWhiteboardDialog, current.pos);
 } else if (["size", "crop", "caption", "link", "metadata"].includes(value)) {
  const element = props.editor.view.nodeDOM?.(current.pos) as HTMLElement | null;
  source.value = element?.querySelector("img")?.src ?? "";
  if (value === "crop" && !source.value) return;
  dimensions.value = { width: rect.width, height: rect.height }; dialogTarget.value = current; dialog.value = value;
 } else if (value === "replace") chooseBlockImage(props.editor, current);
 else if (value === "delete") props.editor.chain().closeHistory().deleteRange({ from: current.pos, to: current.pos + current.node.nodeSize }).run();
 else if (value.startsWith("align:")) updateBlockMedia(props.editor, current, { align: value.slice(6) as "left" | "center" | "right" });
 else if (value.startsWith("rotate:")) {
  const scale = Math.min(1, maximumWidth.value / rect.height);
  updateBlockMedia(props.editor, current, { rotation: media.value.rotation + (value === "rotate:right" ? 90 : -90), width: rect.height * scale, height: rect.width * scale });
 }
 else if (value === "open-link" && media.value.href) props.viewport.ownerDocument.defaultView?.open(media.value.href, "_blank", "noopener,noreferrer");
 else if (value === "flip:x") updateBlockMedia(props.editor, current, { flipX: !media.value.flipX });
 else if (value === "flip:y") updateBlockMedia(props.editor, current, { flipY: !media.value.flipY });
 else if (value === "reset-crop") updateBlockMedia(props.editor, current, { crop: defaultMediaPresentation.crop, width: null, height: null });
 else if (value === "reset-transform") updateBlockMedia(props.editor, current, { rotation: 0, flipX: false, flipY: false, width: null, height: null });
 else if (value === "reset-size") updateBlockMedia(props.editor, current, { width: null, height: null });
}
</script>
<template>
 <template v-if="target && frame">
  <EditorUIObjectFrame v-if="editable" :frame="frame" :portal-target="overlay?.host.value" :identity="target" :viewport="viewport" :maximum-width="maximumWidth" :lock-aspect-ratio="media.lockAspectRatio"
   @resize="updateBlockMedia(editor, target, { width: $event.rect.width, height: $event.rect.height })" />
  <EditorUIAnchoredOverlay :show="!objectOwner && !gallery" :anchor="anchor" placement="top" layer="chrome">
  <div data-block-media-tools>
   <EditorUIObjectToolbar :label="t('图片快捷工具')" :items="localize(items)" @execute="execute($event.value)" />
  </div>
  </EditorUIAnchoredOverlay>
 </template>
 <MediaPreview v-if="gallery" :editor="editor" :gallery="gallery" @close="gallery = null" />
 <MediaDialog v-if="dialog && dialogTarget" :key="dialog" :editor="editor" :target="dialogTarget" :task="dialog" :src="source" :width="dimensions.width" :height="dimensions.height" :maximum-width="maximumWidth" @close="dialog = ''; dialogTarget = null" />
</template>
