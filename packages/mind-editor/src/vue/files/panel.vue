<script setup lang="ts">
import { useMindEditorMessages } from "../messages";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { QuireButton, QuireIcon, QuireIconButton } from "@quirekit/ui/vue";
import { createMindMapTemplate, mindMapTemplates, type MindMapDocument, type MindMapTemplateId } from "@quirekit/mind-map";
import { readMindEditorFile } from "../../ui/files/read";
import type { MindEditorFile, MindEditorImportReport } from "../../ui/files/types";
import type { MindEditorFilesProps } from "./types";
import TemplatePreview from "./preview.vue";
import TemplateGallery from "./gallery.vue";
import FeedbackDialog from "../feedback/dialog.vue";
import { createMindEditorPreviewRenderer } from "../../ui/files/preview";
import { mindEditorTemplateLabels } from "../../locale/templates";
import "./styles.css";
const { t, failure, locale } = useMindEditorMessages();
const props = defineProps<MindEditorFilesProps>();
const emit = defineEmits<{
  /** Closes this optional consumer. */ close: [];
  /** Reports a completed import without retaining its source documents. */ imported: [report: MindEditorImportReport];
}>();
const panel = ref<HTMLElement>(), detail = ref<HTMLElement>(), canvases = ref<HTMLElement>(), renderer = createMindEditorPreviewRenderer();
const fileInput = ref<HTMLInputElement>(), pendingFile = shallowRef<MindEditorFile | null>(null);
const templateId = ref<MindMapTemplateId | null>(null), message = ref(""), reading = ref(false), applying = ref(false);
const disabled = computed(() => props.state.readOnly || props.state.composing || props.state.busy || applying.value);
const sources = mindMapTemplates.map(template => ({ ...template, document: createMindMapTemplate(template.id) }));
const templates = computed(() => sources.map(value => ({ ...value, ...mindEditorTemplateLabels(value, locale.value) })));
const template = computed(() => templates.value.find(value => value.id === templateId.value));
let generation = 0;
onMounted(() => panel.value?.focus({ preventScroll: true }));
onBeforeUnmount(() => { generation++; renderer.dispose(); });
/** Returns to the gallery without changing the document. */
function clearPreview(): void {
  generation++; pendingFile.value = null; templateId.value = null; reading.value = false; message.value = "";
  void nextTick(() => panel.value?.querySelector<HTMLElement>(".qk-mind-editor__gallery")?.focus({ preventScroll: true }));
}

/** @param id - User-selected template. Review never changes the current source. */
function choose(id: MindMapTemplateId): void {
  if (disabled.value) return;
  generation++; reading.value = false; templateId.value = id; pendingFile.value = null; message.value = "";
  void nextTick(() => detail.value?.focus({ preventScroll: true }));
}
/** @param event - Explicit import intent. @returns Direct import or a choice among multiple canvases. */
async function read(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement, file = input.files?.[0]; input.value = "";
  if (!file || disabled.value) return;
  const ticket = ++generation; reading.value = true; pendingFile.value = null; templateId.value = null; message.value = "";
  try {
    const result = await readMindEditorFile(file);
    if (ticket !== generation) return;
    reading.value = false;
    if (disabled.value) { message.value = t("importUnavailable"); return; }
    // Picking a file is the import intent. Only a workbook with multiple
    // canvases needs another choice; do not silently choose its first canvas.
    if (result.sheets.length === 1) await importSheet(result, 0);
    else {
      pendingFile.value = result;
      await nextTick();
      if (ticket === generation) canvases.value?.focus({ preventScroll: true });
    }
  } catch (reason) { if (ticket === generation) message.value = t("readFailed", { reason: failure(reason, "invalidFile") }); }
  finally { if (ticket === generation) reading.value = false; }
}
/** @param file - Validated source. @param index - Chosen canvas. @returns Direct undoable import. */
async function importSheet(file: MindEditorFile, index: number): Promise<void> {
  const sheet = file.sheets[index];
  if (sheet) await apply(sheet.document, { name: file.name, title: sheet.title || sheet.document.root.text, diagnostics: file.diagnostics });
}
/** @param document - Source to load. @param imported - File feedback, absent for templates.
 * @returns One undoable content replacement followed by a viewport fit. */
async function apply(document: MindMapDocument, imported?: MindEditorImportReport): Promise<void> {
  if (disabled.value || reading.value) return;
  const instance = props.editor, ticket = generation; applying.value = true; message.value = "";
  try {
    await instance.replaceDocument(document);
    if (ticket === generation && props.editor === instance) {
      await instance.fit();
      // Complete the import before presenting its result. Feedback floats above
      // the final canvas and cannot change the dimensions used by fit().
      if (ticket === generation && props.editor === instance) {
        emit("close");
        if (imported) emit("imported", imported);
      }
    }
  } catch (reason) { if (ticket === generation) message.value = t("loadFailed", { reason: failure(reason) }); }
  finally { applying.value = false; }
}
/** @param event - Panel keys, isolated from canvas commands. */
function keydown(event: KeyboardEvent): void {
  event.stopPropagation();
  if (event.key === "Escape" && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); if (!applying.value) emit("close"); }
}
/** @returns The file entry after an import or template application fails. */
function feedbackFocus(): HTMLElement | null {
  return panel.value?.querySelector<HTMLElement>("button:not(:disabled)") ?? null;
}
</script>

<template>
  <aside ref="panel" class="qk-mind-editor__files" :class="{ 'qk-mind-editor__files--preview': !!template }" :aria-label="t('files')" tabindex="-1" @keydown="keydown">
    <header class="qk-mind-editor__files-header">
      <strong>{{ t('files') }}</strong>
      <input ref="fileInput" type="file" :aria-label="t('importFile')" accept=".json,.xmind,.md,.markdown,.txt,application/json,text/markdown,text/plain" hidden @change="read" />
      <QuireButton size="sm" variant="outline" :disabled="disabled" @click="fileInput?.click()"><template #leading><QuireIcon name="folderOpen" /></template>{{ reading ? t('readingFile') : applying ? t('loading') : t('importAction') }}</QuireButton>
      <QuireIconButton :label="t('closeFiles')" variant="ghost" size="sm" :disabled="applying" @click="emit('close')"><QuireIcon name="close" /></QuireIconButton>
    </header>
    <FeedbackDialog :message="message" :title="t('importFailed')" :final-focus-el="feedbackFocus" @close="message = ''" />
    <div class="qk-mind-editor__files-body">
      <section v-if="pendingFile" ref="canvases" class="qk-mind-editor__gallery qk-mind-editor__file-sheets" :aria-label="t('chooseCanvas')" tabindex="-1">
        <div class="qk-mind-editor__file-detail-heading"><strong class="qk-mind-editor__file-name">{{ pendingFile.name }}</strong>
          <QuireButton size="sm" variant="ghost" :disabled="applying" @click="clearPreview">{{ t('backTemplates') }}</QuireButton></div>
        <p class="qk-mind-editor__outline-note">{{ t('sheetCount', { count: pendingFile.sheets.length }) }}</p>
        <div class="qk-mind-editor__gallery-scroll"><div class="qk-mind-editor__templates">
          <QuireButton v-for="(sheet, index) in pendingFile.sheets" :key="index" :aria-label="t('importSheet', { index: index + 1, title: sheet.title || t('untitledCanvas') })" variant="outline" :disabled="disabled" @click="importSheet(pendingFile, index)">
            <span class="qk-mind-editor__template-card"><TemplatePreview :document="sheet.document" :renderer="renderer" :theme="theme" />
              <span class="qk-mind-editor__template-caption"><strong>{{ index + 1 }}. {{ sheet.title || t('untitledCanvas') }}</strong><small>{{ t('centralTopic', { title: sheet.document.root.text }) }}</small></span></span>
          </QuireButton>
        </div></div>
      </section>
      <TemplateGallery v-else :templates="templates" :renderer="renderer" :theme="theme" :selected="templateId" :disabled="disabled" @choose="choose" />
      <section ref="detail" class="qk-mind-editor__file-detail" :aria-label="t('selectedPreview')" tabindex="-1">
        <template v-if="template">
          <div class="qk-mind-editor__file-detail-heading"><strong class="qk-mind-editor__file-name">{{ template.title }}</strong>
            <QuireButton size="xs" variant="ghost" :disabled="applying" @click="clearPreview">{{ t('backTemplates') }}</QuireButton></div>
          <p class="qk-mind-editor__outline-note">{{ template.description }}</p>
          <TemplatePreview :document="template.document" :renderer="renderer" :theme="theme" priority="selection" />
          <p class="qk-mind-editor__outline-note">{{ t('centralTopic', { title: template.document.root.text }) }}</p>
          <div class="qk-mind-editor__file-apply"><p class="qk-mind-editor__outline-note">{{ t('replaceWarning') }}</p>
            <QuireButton :disabled="disabled || reading" size="sm" color="primary" variant="solid" @click="apply(template.document)">{{ applying ? t('applying') : t('useCanvas') }}</QuireButton></div>
        </template>
      </section>
    </div>
  </aside>
</template>
