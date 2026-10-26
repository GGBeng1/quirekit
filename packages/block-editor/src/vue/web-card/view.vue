<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, ref, toRef, watch } from "vue";
import type { Node as PMNode } from "@quirekit/pm";
import { QuireButton, QuireIcon } from "@quirekit/ui/vue";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { RichContentSurface } from "../../rich-content/types";
import { openRichContent } from "../../rich-content/tasks";
import { readWebMetadata, webLinkTitle } from "../../web-card/metadata";
import { useBlockLinkScope } from "../links/state";
import { restoreBlockEditorFocus } from "../../ui/focus";
import ObjectToolbar from "../objects/toolbar.vue";
import WebCard from "./card.vue";
import { webLinkViewMenu, requestedWebLinkView } from "./menu";
import { useWebPreviewResize } from "./resize";
import { useWebPreviewActivation } from "./activation";

const { t, localize } = useBlockLocale();
const props = defineProps<{
  /** Retained node owner. */ surface: RichContentSurface;
  /** Latest canonical resource. */ node: PMNode;
  /** Live permission. */ editable: boolean;
}>();
const metadata = computed(() => readWebMetadata(props.node.attrs)!);
const mode = computed(() => props.node.attrs.mode === "embed" ? "preview" : "card");
const generation = ref(0), failed = ref(false), feedback = ref("");
const frame = ref<HTMLIFrameElement>();
useWebPreviewActivation(props.surface, frame);
const resize = useWebPreviewResize(props.surface, toRef(props, "node"), toRef(props, "editable"));
const tools = computed<readonly QuireKitToolbarEntry[]>(() => {
  const position = props.surface.position(), editor = props.surface.editor;
  return [
    ...(props.editable ? [webLinkViewMenu(mode.value, view => position !== undefined && editor.can().setBlockWebCardView(position, props.node, view)),
      { value: "edit", label: mode.value === "preview" ? "编辑网页嵌入" : "编辑网页卡片", icon: "edit" }] : []),
    { value: "copy", label: feedback.value || "复制链接", icon: feedback.value === "链接已复制" ? "check" : "copy" },
    { value: "open", label: "打开原网页", icon: "externalLink" },
    ...(mode.value === "preview" ? [{ value: "reload", label: "重新加载预览", icon: "refreshCw" }] : []),
    ...(props.editable ? [{ value: "delete", label: "删除网页", icon: "trash" }] : [])
  ];
});
watch(() => [props.node.attrs.url, props.node.attrs.mode], () => { failed.value = false; feedback.value = ""; });
/** Opens only the authored source; card selection itself never navigates in editing mode. */
function open(): void { props.surface.dom.ownerDocument.defaultView?.open(metadata.value.url, "_blank", "noopener,noreferrer"); }
/** Copies one captured address, without reporting completion on a later resource. */
async function copy(): Promise<void> {
  const source = props.node;
  try { await props.surface.dom.ownerDocument.defaultView!.navigator.clipboard.writeText(metadata.value.url); if (source === props.node) feedback.value = "链接已复制"; }
  catch { if (source === props.node) feedback.value = "复制失败，请重试"; }
}
/** @param value - Intent from the common link toolbar. */
function execute(value: string): void {
  if (value === "open") { open(); return; }
  if (value === "copy") { void copy(); return; }
  if (value === "reload") { generation.value++; failed.value = false; return; }
  const position = props.surface.position(), editor = props.surface.editor;
  if (!props.editable || !editor.isEditable || position === undefined) return;
  const view = requestedWebLinkView(value);
  if (view && editor.commands.setBlockWebCardView(position, props.node, view)) {
    if (view === "link" || view === "title") { restoreBlockEditorFocus(editor); useBlockLinkScope(editor).open(false); }
  } else if (value === "edit") openRichContent(editor, mode.value === "preview" ? "embed" : "webCard", undefined, position);
  else if (value === "delete" && editor.state.doc.nodeAt(position) === props.node) editor.chain().closeHistory().deleteRange({ from: position, to: position + props.node.nodeSize }).run();
}
</script>
<template>
  <div class="qk-rich-object qk-rich-web" :data-web-view="mode">
    <ObjectToolbar :surface="surface" :label="t(mode === 'preview' ? t('网页嵌入快捷工具') : t('网页卡片快捷工具'))" :items="localize(tools)" @execute="execute($event.value)" />
    <div class="qk-rich-object__body">
      <div v-if="mode === 'card'" :class="{ 'qk-rich-web--readable': !editable }" @click="!editable && open()" @dblclick="editable && open()">
        <WebCard :metadata="metadata" />
      </div>
      <div v-else class="qk-rich-web-preview-frame" :data-resizing="resize.height.value !== null || undefined">
        <iframe ref="frame" :key="generation" :src="metadata.url" :title="webLinkTitle(metadata)" :style="{ height: (resize.height.value ?? metadata.height) + 'px' }" class="qk-rich-embed"
          sandbox="allow-scripts allow-forms allow-presentation" referrerpolicy="no-referrer" loading="lazy" @error="failed = true" />
        <div class="qk-rich-web-preview-frame__source">
          <span>{{ failed ? t('网页暂时无法预览') : webLinkTitle(metadata) }}</span>
          <QuireButton variant="text" size="xs" @click="open">{{ t("打开原网页") }}<template #trailing><QuireIcon name="externalLink" :size="16" /></template></QuireButton>
        </div>
        <button v-if="editable" class="qk-rich-web-resize" data-rich-interactive role="separator" :aria-label="t('调整网页预览高度')" aria-orientation="horizontal"
          :aria-valuenow="resize.height.value ?? metadata.height" :aria-valuemin="160" :aria-valuemax="800" @pointerdown="resize.drag" @keydown="resize.key"><span /></button>
      </div>
    </div>
    <span v-if="feedback" class="qk-rich-web-feedback" role="status">{{ t(feedback) }}</span>
  </div>
</template>
