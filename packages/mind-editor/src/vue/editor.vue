<script setup lang="ts">
import { useMindEditorMessages } from "./messages";
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { createTheme, quireIconRegistry, type QuireKitToolbarExecuteEvent } from "@quirekit/ui";
import { QuireContextMenu, QuireIcon, QuireIconProvider, QuireThemeProvider, QuireToolbar } from "@quirekit/ui/vue";
import type { MindMapEditorCommand } from "@quirekit/mind-map-simple";
import type { MindMapLayout } from "@quirekit/mind-map";
import type { MindEditorEmits, MindEditorHandle, MindEditorProps } from "./workspace/types";
import { useMindEditorSession } from "./session";
import { mindEditorToolbar, mindEditorViewportToolbar } from "../ui/toolbar";
import { downloadMindMap } from "../ui/download";
import { mindEditorContextItems } from "../ui/structure";
import NavigationPanel from "./navigation/panel.vue";
import OverviewPanel from "./overview/panel.vue";
import FormattingPanel from "./formatting/panel.vue";
import DetailsPanel from "./details/panel.vue";
import AnnotationPanel from "./annotations/panel.vue";
import FilesPanel from "./files/panel.vue";
import ImportReport from "./files/report.vue";
import FeedbackDialog from "./feedback/dialog.vue";
import RecoveryDialog from "./recovery/dialog.vue";
import { useMindEditorPanels } from "./panels/session";
import type { MindEditorImportReport } from "../ui/files/types";
import "./styles.css";

const { t, locale } = useMindEditorMessages();
const props = defineProps<MindEditorProps>();
const emit = defineEmits<MindEditorEmits>();
const fallbackTheme = createTheme();
const theme = computed(() => props.theme ?? fallbackTheme);
const container = ref<HTMLElement>();
const { editor, drafts, draftVersion, state, loading, dirty, error, report, sourceVersion, recovery, acceptRecoverySave } = useMindEditorSession(props, container, theme,
  instance => emit("ready", instance), count => emit("change", count), reason => emit("error", reason));
const printLifetime = new AbortController();
onBeforeUnmount(() => printLifetime.abort());
const busy = ref(false);
const overviewShown = ref(false);
const panels = useMindEditorPanels(() => editor.value, state, () => {
  if (editor.value && !state.composing && !importReport.value?.diagnostics.length) editor.value.focus();
});
const { name: activePanel, detailRequest, annotationId } = panels;
const importReport = shallowRef<MindEditorImportReport | null>(null);
watch(recovery.blocked, value => emit("recoveryPending", value), { immediate: true });
watch(recovery.restored, () => {
  if (drafts.value?.snapshot().details?.length) panels.open("details");
  else if (drafts.value?.snapshot().annotations?.length) panels.open("annotations");
});
watch(() => props.document, () => { importReport.value = null; panels.close(); });
const items = computed(() => mindEditorToolbar(state, !!editor.value && !loading.value && !busy.value, activePanel.value, t, overviewShown.value));
const viewItems = computed(() => mindEditorViewportToolbar(state, !!editor.value && !loading.value && !busy.value, t));
const contextItems = computed(() => mindEditorContextItems(state, !!editor.value && !loading.value && !busy.value, t));
const background = computed(() => {
  const step = 24 * state.scale * 2 ** Math.ceil(Math.log2(1 / state.scale));
  return { backgroundSize: `${step}px ${step}px`, backgroundPosition: `${state.x}px ${state.y}px` };
});
const status = computed(() => loading.value ? t("opening") : state.composing ? t("typing") : state.readOnly ? t("readOnly") : dirty.value ? t("modified") : t("ready"));
const documentTitle = computed(() => (props.title ?? state.rootText).trim() || t("untitledMap"));

/** @returns Property publication before releasing the panel's input and focus. */
async function closeProperties(): Promise<void> {
  const instance = editor.value;
  try { await drafts.value?.settled(); if (editor.value === instance) panels.close(); }
  catch (reason) { report(reason); }
}
/** @returns Current public editor, rejecting before initialization. */
function requireEditor() {
  if (!editor.value) throw new Error(t("notReady"));
  return editor.value;
}
/** @param event - One public Toolbar intent. @returns Command completion. */
async function execute(event: QuireKitToolbarExecuteEvent): Promise<void> {
  event.nativeEvent?.stopPropagation();
  const instance = editor.value;
  if (event.source === "menu") {
    // The first frame closes the shared menu and its optional overflow popover;
    // the next transfers input ownership after both layers restore their focus.
    await nextTick();
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }
  if (editor.value !== instance || !container.value?.isConnected) return;
  await run(event.value);
}
/** @param value - Toolbar or context-menu command. @returns Intent completion. */
async function run(value: string): Promise<void> {
  if (!editor.value || loading.value || busy.value || state.composing) return;
  if (value === "overview") { overviewShown.value = !overviewShown.value; return; }
  if (panels.open(value)) return;
  busy.value = true;
  try {
    const instance = editor.value;
    if (value.startsWith("annotation:")) await panels.insertAnnotation(value);
    else if (value === "fit") await instance.fit();
    else if (value === "print") await (await import("../runtime/printing/print")).printMindMap(await instance.exportSvg(), document, printLifetime.signal);
    else if (value === "center") await instance.center();
    else if (value === "fit-selection") await instance.fitSelection();
    else if (value === "focus-branch" && state.selectedId) { await instance.focusBranch(state.selectedId); await instance.fitSelection(); }
    else if (value === "zoom-in") instance.setZoom(state.scale * 1.15);
    else if (value === "zoom-out") instance.setZoom(state.scale / 1.15);
    else if (value === "zoom-reset") instance.setZoom(1);
    else if (value.startsWith("layout:")) await instance.setLayout(value.slice(7) as MindMapLayout);
    else if (value === "export-json" || value === "export-svg" || value === "export-png" || value === "export-xmind" || value === "export-markdown" || value === "export-outline" || value === "export-pdf") {
      importReport.value = await downloadMindMap(instance, value.slice(7) as "json" | "svg" | "png" | "xmind" | "markdown" | "outline" | "pdf", theme.value.color.surface.page, t);
    } else await instance.execute(value as MindMapEditorCommand);
    if (value !== "edit-text" && !value.startsWith("annotation:") && !importReport.value?.diagnostics.length) instance.focus();
  } catch (reason) { report(reason); }
  finally { busy.value = false; }
}
/** @returns The canvas input owner after a completed import's warning closes. */
function importFocus(): HTMLElement | null {
  if (!state.composing) editor.value?.focus();
  return (container.value?.ownerDocument.activeElement as HTMLElement | null) ?? null;
}
/** @param event - Keyboard event before canvas-local routing. */
function searchShortcut(event: KeyboardEvent): void {
  if (!event.altKey && !event.shiftKey && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f"
    && !state.composing && !event.isComposing && !(event.target as Element).closest("[contenteditable],input,textarea")) {
    event.preventDefault(); event.stopPropagation(); panels.open("find", true);
  }
}
/** @param event - Context request before the shared menu claims it. */
function prepareContext(event: MouseEvent): void {
  if (!editor.value || loading.value || busy.value || !editor.value.prepareContextMenu(event.target)) {
    event.stopPropagation(); return;
  }
  const target = event.target as Element, region = target.closest(".qk-mind-editor__context");
  // Vendor nodes consume bubbling context events. Forward the admitted request at
  // the shared menu boundary after selecting its target, preserving pointer coordinates.
  if (region && target !== region) {
    event.preventDefault(); event.stopPropagation();
    region.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true,
      button: 2, clientX: event.clientX, clientY: event.clientY }));
  }
}
/** Continues the shared menu's deferred focus return at the canvas input owner. */
function focusContext(): void {
  if (editor.value && !loading.value && !state.composing) editor.value.focus();
}
const handle: MindEditorHandle = {
  /** @returns Clear completion after explicit successful save or cancellation. */
  finishRecovery: recovery.finish,
  acceptRecoverySave,
  /** @returns Source after current native text is committed. */
  getDocument: () => requireEditor().getDocument(),
  /** @returns Complete content-only SVG. */
  exportSvg: () => requireEditor().exportSvg(),
  /** Returns keyboard focus to the canvas. */
  focus: () => requireEditor().focus(),
  /** @returns Completion of fitting the current rendered content. */
  fit: () => requireEditor().fit(),
};
defineExpose(handle);
</script>

<template>
  <QuireThemeProvider :theme="theme">
    <QuireIconProvider :registry="quireIconRegistry">
      <section :lang="locale" class="qk-mind-editor" :aria-label="`Quire Mind · ${documentTitle}`" :aria-busy="loading">
        <header class="qk-mind-editor__header">
          <div class="qk-mind-editor__identity">
            <QuireIcon name="listTree" :size="20" class="qk-mind-editor__brand-icon" /><h1>Quire Mind</h1>
            <span class="qk-mind-editor__identity-divider" aria-hidden="true"></span>
            <span class="qk-mind-editor__document-title" :title="documentTitle">{{ documentTitle }}</span>
          </div>
          <div class="qk-mind-editor__header-actions"><span class="qk-mind-editor__status" role="status">{{ status }}</span><slot name="actions" /></div>
        </header>
        <div class="qk-mind-editor__toolbar" @mousedown.stop @click.stop>
          <QuireToolbar :label="t('toolbarLabel')" :items="items" variant="elevated" align="center"
            preserve-focus overflow="collapse" class="qk-mind-editor__format-toolbar" @execute="execute" />
        </div>
        <ImportReport :report="importReport" :final-focus-el="importFocus" @close="importReport = null" />
        <FeedbackDialog :message="error" :final-focus-el="importFocus" @close="error = ''" />
        <RecoveryDialog :state="recovery.state.value" :restore="recovery.restore" :discard="recovery.discard" :final-focus-el="importFocus" @error="report" />
        <div class="qk-mind-editor__workspace">
          <NavigationPanel v-if="activePanel === 'find' && editor && !loading" :editor="editor" :state="state" :version="sourceVersion" @close="panels.close" @error="report" />
        <div class="qk-mind-editor__canvas" :inert="activePanel === 'files'" :style="background" @contextmenu.capture="prepareContext" @keydown.capture="searchShortcut">
          <QuireContextMenu :label="t('contextLabel')" :items="contextItems" width="300px" class="qk-mind-editor__context"
            @select="run" @focus="focusContext">
            <template #trigger><div ref="container" class="qk-mind-editor__surface"></div></template>
          </QuireContextMenu>
          <div v-if="loading" class="qk-mind-editor__loading">{{ t('opening') }}</div>
          <OverviewPanel v-if="overviewShown && editor && !loading" :editor="editor" :state="state" @close="overviewShown = false" @error="report" />
        </div>
          <FormattingPanel v-if="activePanel === 'format' && editor && !loading" :editor="editor" :state="state" :version="sourceVersion" @close="panels.close" @error="report" />
          <DetailsPanel v-if="activePanel === 'details' && editor && drafts && !loading" :editor="editor" :state="state" :version="sourceVersion" :request="detailRequest" :drafts="drafts!" :draft-version="draftVersion" @close="closeProperties" @error="report" />
          <AnnotationPanel v-if="activePanel === 'annotations' && editor && drafts && !loading" :editor="editor" :state="state" :version="sourceVersion" :selected-id="annotationId" :drafts="drafts!" :draft-version="draftVersion" @close="closeProperties" @error="report" />
          <FilesPanel v-if="activePanel === 'files' && editor && !loading" :editor="editor" :state="state" :theme="theme" @imported="importReport = $event" @close="panels.close" />
        </div>
        <footer class="qk-mind-editor__footer">
          <span class="qk-mind-editor__hint" :title="t('canvasHelp')">{{ state.selectedCount > 1 ? `${t('selectedCount', { count: state.selectedCount })} · ` : '' }}{{ t('canvasHint') }}</span>
          <div class="qk-mind-editor__navigation" @mousedown.stop @click.stop>
            <QuireToolbar :label="t('canvasView')" :items="viewItems" preserve-focus align="start" @execute="execute" />
          </div>
        </footer>
      </section>
    </QuireIconProvider>
  </QuireThemeProvider>
</template>
