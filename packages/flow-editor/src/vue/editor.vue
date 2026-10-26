<script setup lang="ts">
import { useFlowMessages } from "./messages";
import { computed, nextTick, ref, watch } from "vue";
import { createTheme, quireIconRegistry, type QuireKitToolbarOpenChangeEvent, type QuireKitToolbarExecuteEvent } from "@quirekit/ui";
import { QuireDialogRoot, QuireIcon, QuireIconProvider, QuireThemeProvider, QuireToolbar } from "@quirekit/ui/vue";
import type { FlowchartNode, FlowchartNodeContent, FlowchartShape } from "@quirekit/flowchart";
import type { FlowEditorEmits, FlowEditorHandle, FlowEditorProps } from "./types";
import type { FlowchartTemplateId } from "../templates/types";
import { useFlowEditorSession } from "./session";
import { localizeFlowEntries } from "../locale/projection";
import { flowEditorToolbar, flowViewportToolbar } from "../ui/toolbar";
import { executeFlowAction } from "../ui/execute";
import ContextMenu from "./context/menu.vue";
import LibraryPanel from "./library/panel.vue";
import FlowPalette from "./palette.vue";
import TemplateGallery from "./templates/gallery.vue";
import { createFlowchartTemplate } from "../templates/catalog";
import ColorControl from "./formatting/color-control.vue";
import StyleMenu from "./formatting/style-menu.vue";
import ClassMembers from "./modeling/classes.vue";
import Members from "./modeling/members.vue";
import ObjectPanel from "./formatting/object-panel.vue";
import TextPanel from "./formatting/text-panel.vue";
import AlignmentPanel from "./geometry/alignment.vue";
import { applyFlowFormattingIntent } from "./formatting/intent";
import ExportPanel from "./export/panel.vue";
import { useFlowExportDialog } from "./export/session";
import SearchPanel from "./navigation/search.vue";
import OverviewPanel from "./navigation/overview.vue";
import ShortcutsHelp from "./help/shortcuts.vue";
import RichTextPanel from "./text/panel.vue";
import { useFlowTextDialog } from "./text/session";
import MediaPanel from "./media/panel.vue";
import { useFlowMediaDialog } from "./media/session";
import PagePanel from "./pages/panel.vue";
import { useFlowPageDialog } from "./pages/session";
import PlaybackPanel from "./playback/panel.vue";
import { useFlowPlaybackSession } from "./playback/session";
import "./styles.css";
import { v4 as uuidv4 } from "uuid";

const { t, locale, failure } = useFlowMessages();

const props = defineProps<FlowEditorProps>();
const emit = defineEmits<FlowEditorEmits>();
const fallbackTheme = createTheme(), theme = computed(() => props.theme ?? fallbackTheme);
const container = ref<HTMLElement>();
const { editor, state, loading, dirty, error, report, contextPoint, contentVersion, imageEditId } = useFlowEditorSession(props, container, theme,
  value => emit("ready", value), value => emit("change", value), value => emit("error", value));
const { open: playbackOpen, visible: playbackVisible, state: runState, trace: playbackTrace, edit: editPlayback, snapshot: snapshotPlayback, play: playPlayback, close: closePlayback } = useFlowPlaybackSession(editor, props, report, value => emit("playback", value));
const { request: exportRequest, open: openExport } = useFlowExportDialog(editor, contentVersion);
const { request: pageRequest, open: openPages, apply: applyPages, close: closePages } = useFlowPageDialog(editor, contentVersion);
watch([editor, () => props.document, () => state.readOnly], closePages, { flush: "sync" });
const { request: textRequest, open: openRichText, apply: applyRichText } = useFlowTextDialog(editor, contentVersion);
watch([editor, () => props.document, () => state.readOnly], () => { textRequest.value = undefined; });
const { request: mediaRequest, open: openMedia, apply: applyMedia } = useFlowMediaDialog(editor, contentVersion);
watch([editor, () => props.document, () => state.readOnly], () => { mediaRequest.value = undefined; });
watch(imageEditId, id => { imageEditId.value = undefined; if (id) void openMedia("upload", true).catch(report); });
const busy = ref(false), templateOpen = ref(false), templateReturn = ref<HTMLElement>();
let templateApplied = false;
const libraryOpen = ref(false), libraryIntent = ref<"browse"|"template"|"component">("browse"), libraryReturn = ref<HTMLElement>();
/** @returns This workspace's stable file-menu trigger after a transient menu item unmounts. */
function fileTrigger(): HTMLElement | null { return container.value?.closest(".qk-flow-editor")?.querySelector<HTMLElement>("[data-flow-file-actions]") ?? null; }
watch([() => props.document, () => props.libraryStore, () => editor.value, () => state.readOnly, () => state.composing], () => { libraryOpen.value = false; });
/** @returns Live toolbar focus owner or canvas fallback after dismissing the library. */
function libraryFocus(): HTMLElement | null { return libraryReturn.value?.isConnected ? libraryReturn.value : container.value?.querySelector<HTMLElement>("[role=application]") ?? null; }
const memberNode = ref<FlowchartNode>();
let memberEditor: typeof editor.value;
watch([() => editor.value, () => JSON.stringify(state.selectedIds), () => state.readOnly, () => state.selectionLocked, () => props.document], () => { memberNode.value = undefined; });
/** @param content - Dialog draft. Guards the captured source owner before a single mutation. */
function applyMembers(content: FlowchartNodeContent): void {
  const node = memberNode.value;
  if (!node || memberEditor !== editor.value || state.readOnly || state.selectionLocked || state.selectedIds.length !== 1 || state.selectedIds[0] !== node.id) throw new Error("编辑目标已改变，请重新打开");
  current().setNodeContent(node.id, content, node);
}
watch(() => [props.document, props.readOnly, state.readOnly, loading.value, state.composing], () => { templateOpen.value = false; });
/** @returns Valid focus owner after dismissing or applying a template. */
function templateFocus(): HTMLElement | null {
  const trigger = templateReturn.value;
  return !templateApplied && trigger?.isConnected && !trigger.matches(":disabled") ? trigger : container.value?.querySelector<HTMLElement>("[role=application]") ?? null;
}
/** @param id - Selected recipe; browsing never reaches this mutation boundary. */
function applyTemplate(id: FlowchartTemplateId): void {
  if (!available.value || state.readOnly || state.composing) return;
  try {
    const source = createFlowchartTemplate(id, `template-${uuidv4()}`, locale.value);
    current().replaceDocument({ ...source, revision: props.document.revision }); current().fit();
    error.value = ""; templateApplied = true; templateOpen.value = false;
  } catch (reason) { report(reason); }
}
const available = computed(() => !!editor.value && !loading.value && !busy.value);
const objectOpen = ref(false), objectTab = ref("geometry");
/** @param event - Controlled popup state from the shared Toolbar. */
function toolbarOpen(event: QuireKitToolbarOpenChangeEvent): void { if (event.item.value === "object") { objectOpen.value = event.expanded; if (!event.expanded) objectTab.value = "geometry"; } }
const formatRenderers = { object: ObjectPanel, color: ColorControl, style: StyleMenu, typography: TextPanel, alignment: AlignmentPanel };
const formatContext = computed(() => ({ editor: editor.value, state, contentVersion: contentVersion.value }));
const items = computed(() => localizeFlowEntries(flowEditorToolbar(state, available.value), locale.value).map(item => item.value === "object" ? { ...item, expanded: objectOpen.value, meta: objectTab.value } : item));
const searchOpen = ref(false), overviewOpen = ref(false);
watch(() => state.presenting, value => {
  if (!value) return;
  templateOpen.value = libraryOpen.value = objectOpen.value = false;
  memberNode.value = textRequest.value = mediaRequest.value = undefined; contextPoint.value = undefined;
});
watch(editor, () => { searchOpen.value = false; overviewOpen.value = false; });
const viewItems = computed(() => localizeFlowEntries(flowViewportToolbar(state, available.value), locale.value).map(item => item.value === "view-search" ? { ...item, pressed: searchOpen.value } : item.value === "view-overview" ? { ...item, pressed: overviewOpen.value } : item));
const status = computed(() => loading.value ? "正在打开…" : state.composing ? "正在输入…" : state.presenting ? "演示模式" : state.readOnly ? "只读" : dirty.value ? "已修改" : "就绪");
const background = computed(() => {
  const step = 24 * state.scale * 2 ** Math.ceil(Math.log2(1 / state.scale));
  return { backgroundSize: `${step}px ${step}px`, backgroundPosition: `${state.x}px ${state.y}px` };
});
/** @returns The initialized neutral controller. */
function current() { if (!editor.value) throw new Error("流程图尚未就绪"); return editor.value; }
/** @param event - Public dialog Escape event. Preserves native candidate cancellation before dismissing a draft. */
function guardNativeEscape(event: KeyboardEvent): void { if (event.isComposing || event.keyCode === 229) event.preventDefault(); }
/** @param shape - Chosen palette entry. */
function add(shape: FlowchartShape): void {
  try { current().addNode(shape); error.value = ""; current().focus(); } catch (reason) { report(reason); }
}
/** @param shape - Palette source. @param event - Pointer press passed to the shared graph owner. */
function drag(shape: FlowchartShape, event: PointerEvent): void {
  try { current().beginNodeDrag(shape, event); error.value = ""; } catch (reason) { report(reason); }
}
/** @param instance - Controller that just created a connected object. Hands focus back after the public menu's close frame, without stealing it after source/selection changes. */
function focusConnected(instance: ReturnType<typeof current>): void {
  const selection = JSON.stringify(state.selectedIds), version = contentVersion.value;
  container.value?.ownerDocument.defaultView?.requestAnimationFrame(() => {
    if (editor.value === instance && !state.composing && contentVersion.value === version && selection === JSON.stringify(state.selectedIds)) instance.focus();
  });
}
/** @param event - Public Toolbar intent. @returns Completion of the requested operation. */
async function execute(event: Pick<QuireKitToolbarExecuteEvent, "value" | "nativeEvent"> & { readonly payload?: unknown }): Promise<void> {
  if (!available.value || state.composing) return;
  if (event.value === "playback") { playbackOpen.value = true; return; }
  if (event.value === "page-setup") { try { await openPages(); } catch (reason) { report(reason); } return; }
  if (event.value === "object" && event.payload === "edit-members") { objectOpen.value = false; event = { ...event, value: "edit-members" }; }
  if (event.value === "object" && event.payload === "media-edit") { objectOpen.value = false; event = { ...event, value: "media-edit" }; }
  if (event.value === "font" && event.payload === "rich-text") event = { ...event, value: "rich-text" };
  if (event.value === "rich-text") { try { await openRichText(); } catch (reason) { report(reason); } return; }
  if (event.value === "view-search") { searchOpen.value = !searchOpen.value; if (!searchOpen.value) current().focus(); return; }
  if (event.value === "view-overview") { overviewOpen.value = !overviewOpen.value; return; }
  if (["media-upload", "media-icons", "media-edit"].includes(event.value)) {
    try { await openMedia(event.value === "media-icons" ? "icons" : "upload", event.value === "media-edit"); } catch (reason) { report(reason); }
    return;
  }
  if (event.value === "open-geometry" || event.value === "open-replace-shape") {
    const owner = editor.value, selection = JSON.stringify(state.selectedIds);
    contextPoint.value = undefined; await nextTick();
    if (owner === editor.value && selection === JSON.stringify(state.selectedIds) && !state.readOnly && !state.composing) { objectTab.value = event.value === "open-geometry" ? "geometry" : "shape"; objectOpen.value = true; }
    return;
  }
  if (["library", "library-template", "library-component"].includes(event.value)) {
    libraryIntent.value = event.value === "library-template" ? "template" : event.value === "library-component" ? "component" : "browse";
    libraryReturn.value = (event.nativeEvent?.target as HTMLElement | null)?.closest("button") ?? fileTrigger() ?? undefined;
    libraryOpen.value = true; return;
  }
  if (event.value === "edit-members") {
    if (state.readOnly || state.selectionLocked || state.selectedIds.length !== 1) return;
    const owner = current(), id = state.selectedIds[0];
    try {
      const source = await owner.getDocument();
      if (owner !== editor.value || state.readOnly || state.selectedIds[0] !== id) return;
      memberEditor = owner; memberNode.value = source.nodes.find(n => n.id === id);
    } catch (reason) { report(reason); }
    return;
  }
  if (event.value === "templates") {
    if (state.readOnly) return;
    templateReturn.value = (event.nativeEvent?.target as HTMLElement | null)?.closest("button") ?? fileTrigger() ?? undefined;
    templateApplied = false; templateOpen.value = true; return;
  }
  try {
    if (applyFlowFormattingIntent(current(), event.value, event.payload)) { objectOpen.value = false; error.value = ""; return; }
    if (event.value === "export-svg" || event.value === "export-png") { await openExport(event.value === "export-svg" ? "svg" : "png"); return; }
  } catch (reason) { report(reason); return; }
  busy.value = true;
  try {
    const instance = current(), value = ["line", "arrows", "alignment"].includes(event.value) && typeof event.payload === "string" ? event.payload : event.value;
    await executeFlowAction(instance, value, props.document.revision, locale.value);
    error.value = ""; if (value !== "edit-text") instance.focus();
    if (value.startsWith("quick-")) focusConnected(instance);
  } catch (reason) { report(reason); }
  finally { busy.value = false; }
}
const handle: FlowEditorHandle = {
  /** @returns Current portable source. */ getDocument: () => current().getDocument(),
  /** @returns Content SVG. */ exportSvg: () => current().exportSvg(),
  /** Focuses the graph. */ focus: () => current().focus(),
  /** Fits content. */ fit: () => current().fit(),
};
defineExpose(handle);
</script>

<template>
  <QuireThemeProvider :theme="theme">
    <QuireIconProvider :registry="quireIconRegistry">
      <section class="qk-flow-editor" :lang="locale" :aria-label="title ?? t('流程图')" :aria-busy="loading">
        <header class="qk-flow-editor__header">
          <div class="qk-flow-editor__identity"><QuireIcon name="workflow" :size="20" /><h1>{{ title ?? t('流程图') }}</h1></div>
          <div class="qk-flow-editor__actions"><span class="qk-flow-editor__status" role="status">{{ t(status) }}</span><slot name="actions" /></div>
        </header>
        <div v-if="mode !== 'presentation' && !(state.presenting && playbackTrace.presentation === 'motion')" class="qk-flow-editor__toolbar">
          <QuireToolbar :label="t('流程图工具栏')" :items="items" :renderers="formatRenderers" :context="formatContext" variant="elevated" align="start" preserve-focus overflow="scroll" class="qk-flow-editor__format-toolbar" @execute="execute" @open-change="toolbarOpen" />
          <ShortcutsHelp :disabled="state.composing" />
        </div>
        <div class="qk-flow-editor__workspace">
          <FlowPalette v-if="!playbackVisible && mode !== 'presentation'" :disabled="!available || state.readOnly || state.composing || state.presenting" @insert="add" @drag="drag" />
          <div class="qk-flow-editor__canvas" :style="background">
            <div ref="container" class="qk-flow-editor__surface"></div>
            <div v-if="loading" class="qk-flow-editor__loading">{{ t('正在打开流程图…') }}</div>
            <div v-if="error" class="qk-flow-editor__error" role="alert">{{ failure(error) }}</div>
            <SearchPanel v-if="searchOpen && editor" :editor="editor" @close="searchOpen = false; current().focus()" />
            <OverviewPanel v-if="overviewOpen && editor" :editor="editor" @close="overviewOpen = false; current().focus()" />
          </div>
          <PlaybackPanel v-if="playbackVisible && editor" :editor="editor" :state="runState" :trace="playbackTrace" :editor-state="state" :presentation-only="mode === 'presentation'" @close="closePlayback" @start="playPlayback()" @edit="editPlayback" @snapshot="snapshotPlayback" @error="report" />
        </div>
        <footer class="qk-flow-editor__footer">
          <span class="qk-flow-editor__hint" role="status">{{ t(state.presenting ? "空格播放 / 暂停 · → 下一步 · ← 上一步 · Escape 退出演示" : state.paintingFormat ? "格式刷：点击同类型目标应用格式 · Escape 取消" : "空白拖动框选 · 中键 / 滚轮平移 · 方向键微调（Shift ×10） · 右键更多操作") }}</span>
          <QuireToolbar :label="t('画布视图')" :items="viewItems" preserve-focus align="start" @execute="execute" />
        </footer>
      </section>
      <ContextMenu v-if="contextPoint && editor" :key="`${contextPoint.x}:${contextPoint.y}`" :point="contextPoint" :editor="editor" :state="state" @close="contextPoint = undefined" @execute="execute({ value: $event })" />
      <QuireDialogRoot v-model:open="templateOpen" :final-focus-el="templateFocus">
        <TemplateGallery v-if="templateOpen" :theme="theme" :disabled="!available || state.readOnly || state.composing" @apply="applyTemplate" @close="templateOpen = false" />
      </QuireDialogRoot>
      <QuireDialogRoot v-model:open="libraryOpen" :final-focus-el="libraryFocus">
        <LibraryPanel v-if="libraryOpen && editor" :editor="editor" :store="libraryStore" :theme="theme" :intent="libraryIntent" :disabled="!available || state.readOnly || state.composing" @close="libraryOpen = false" />
      </QuireDialogRoot>
      <QuireDialogRoot :open="!!exportRequest" :final-focus-el="fileTrigger" @update:open="!$event && (exportRequest = undefined)">
        <ExportPanel v-if="exportRequest" :request="exportRequest" :theme="theme" @close="exportRequest = undefined" />
      </QuireDialogRoot>
      <QuireDialogRoot :open="!!pageRequest" :final-focus-el="fileTrigger" @escape-key-down="guardNativeEscape" @update:open="!$event && closePages()">
        <PagePanel v-if="pageRequest" :request="pageRequest" :read-only="state.readOnly || state.presenting" :apply="applyPages" @close="closePages" />
      </QuireDialogRoot>
      <QuireDialogRoot :open="!!memberNode" @update:open="!$event && (memberNode = undefined)">
        <ClassMembers v-if="memberNode?.uml" :node="memberNode" :apply="applyMembers" @close="memberNode = undefined" />
        <Members v-else-if="memberNode" :node="memberNode" :apply="applyMembers" @close="memberNode = undefined" />
      </QuireDialogRoot>
      <QuireDialogRoot :open="!!textRequest" @escape-key-down="guardNativeEscape" @update:open="!$event && (textRequest = undefined)">
        <RichTextPanel v-if="textRequest" :request="textRequest" :apply="applyRichText" @close="textRequest = undefined; current().focus()" />
      </QuireDialogRoot>
      <QuireDialogRoot :open="!!mediaRequest" @escape-key-down="guardNativeEscape" @update:open="!$event && (mediaRequest = undefined)">
        <MediaPanel v-if="mediaRequest" :request="mediaRequest" :theme="theme" :apply="applyMedia" @close="mediaRequest = undefined; current().focus()" />
      </QuireDialogRoot>
    </QuireIconProvider>
  </QuireThemeProvider>
</template>
