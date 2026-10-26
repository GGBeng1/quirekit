<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { createTheme, quireIconRegistry, type QuireKitToolbarEntry, type QuireKitToolbarExecuteEvent } from "@quirekit/ui";
import { QuireButton, QuireIcon, QuireIconProvider, QuireThemeProvider, QuireToolbar } from "@quirekit/ui/vue";
import { createExcalidrawWhiteboard, type WhiteboardEditor, type WhiteboardEditorState } from "@quirekit/whiteboard-excalidraw";
import type { WhiteboardEditorEmits, WhiteboardEditorHandle, WhiteboardEditorProps, WhiteboardEditorSlots } from "./types";
import { downloadWhiteboardFile } from "../ui/download";
import { guardWhiteboardLeave } from "../runtime/leave";
import { useWhiteboardDraft } from "./draft/use";
import { WhiteboardError } from "@quirekit/whiteboard";
import { useWhiteboardMessages } from "./messages";
import DraftPanel from "./draft/panel.vue";
import "./styles.css";

const props = defineProps<WhiteboardEditorProps>(), emit = defineEmits<WhiteboardEditorEmits>();
defineSlots<WhiteboardEditorSlots>();
const { locale, text, failure } = useWhiteboardMessages();
const fallback = createTheme(), theme = computed(() => props.theme ?? fallback);
const container = ref<HTMLElement>(), input = ref<HTMLInputElement>(), runtime = shallowRef<WhiteboardEditor>();
const loading = ref(true), busy = ref(false), error = ref<unknown>(), dirty = ref(false);
const pendingImport = shallowRef<File>();
const draft = useWhiteboardDraft({ runtime, readOnly: () => !!props.readOnly, changed: markChanged });
const readOnly = computed(() => !!props.readOnly || draft.blocked.value);
let releaseLeave: (() => void) | undefined;
const state = shallowRef<WhiteboardEditorState>({ tool: "selection", zoom: 1, composing: false });
let generation = 0, abort: AbortController | undefined;
const toolbar = computed<readonly QuireKitToolbarEntry[]>(() => [
  { value: "import", label: text.value.importFile, text: text.value.import, icon: "folderOpen", disabled: readOnly.value || !runtime.value || busy.value },
  { value: "source", label: text.value.exportSource, text: text.value.source, icon: "download", disabled: !runtime.value || busy.value },
  { value: "png", label: text.value.exportPng, text: text.value.image, icon: "image", disabled: !runtime.value || busy.value },
]);
const viewport = computed<readonly QuireKitToolbarEntry[]>(() => [
  { value: "fit", label: text.value.fit, text: text.value.fit, disabled: !runtime.value },
]);
/** @param reason - Current action error. */
function report(reason: unknown): void { error.value = reason; emit("error", reason); }
/** Signals unsaved source independently of local checkpoint completion. */
function markChanged(): void { dirty.value = true; draft.change(); emit("change"); }
/** Loads one isolated scene, disposing stale asynchronous mounts. */
async function mount(): Promise<void> {
  const ticket = ++generation; draft.stop(); abort?.abort(); runtime.value?.destroy(); runtime.value = undefined;
  const controller = new AbortController(); abort = controller;
  loading.value = true; busy.value = false; dirty.value = false; error.value = ""; pendingImport.value = undefined;
  try {
    await nextTick(); if (ticket !== generation || !container.value) return;
    await draft.start(props.document, props.drafts, container.value.ownerDocument);
    if (ticket !== generation) return;
    const editor = await createExcalidrawWhiteboard({ container: container.value, document: props.document, theme: theme.value.scheme, locale: locale.value,
      readOnly: readOnly.value, signal: controller.signal,
      /** Records source invalidation only for the live mount. */
      onChange() { if (ticket === generation && !draft.blocked.value) markChanged(); },
      /** @param value - Current upstream toolbar state. */
      onStateChange(value) { if (ticket === generation) state.value = value; },
    });
    if (ticket !== generation) { editor.destroy(); return; }
    runtime.value = editor; editor.setLocale(locale.value); editor.setTheme(theme.value.scheme); editor.setReadOnly(readOnly.value); emit("ready", editor);
  } catch (reason) { if (ticket === generation && !controller.signal.aborted) report(reason); }
  finally { if (ticket === generation) loading.value = false; }
}
/** @param action - Shared toolbar intent. @returns Completion of export or view operation. */
async function execute(action: QuireKitToolbarExecuteEvent): Promise<void> {
  const editor = runtime.value; if (!editor || busy.value) return;
  if (action.value === "import") { input.value?.click(); return; }
  if (action.value === "fit") { editor.fit(); return; }
  if (action.value === "in" || action.value === "out") { editor.zoom(action.value === "in" ? 1.2 : 1 / 1.2); return; }
  busy.value = true; error.value = "";
  try {
    const owner = container.value!.ownerDocument;
    if (action.value === "source") downloadWhiteboardFile(owner, new Blob([JSON.stringify(await editor.getScene(), null, 2)], { type: "application/json" }), `${props.document.title}.excalidraw`);
    if (action.value === "png") {
      const snapshot = await editor.snapshot();
      const blob = await (await fetch(snapshot.preview.dataUrl)).blob();
      downloadWhiteboardFile(owner, blob, `${props.document.title}.png`);
    }
  } catch (reason) { report(reason); } finally { busy.value = false; }
}
/** @param event - Explicitly selected local file. @returns Import completion, preserving source on failure. */
async function importFile(event: Event): Promise<void> {
  const field = event.target as HTMLInputElement, file = field.files?.[0]; field.value = "";
  if (!file || !runtime.value || readOnly.value || busy.value) return;
  if (dirty.value) { pendingImport.value = file; return; }
  await loadFile(file);
}
/** @param file - Explicitly accepted replacement. @returns Import completion without discarding an invalid draft. */
async function loadFile(file: File): Promise<void> {
  const target = runtime.value, ticket = generation;
  if (!target || readOnly.value || busy.value) return;
  pendingImport.value = undefined;
  busy.value = true; error.value = "";
  try {
    if (file.size > 16 * 1024 * 1024) throw new WhiteboardError("tooLarge", "白板超过 16 MB");
    const source = await file.text();
    if (ticket === generation && !readOnly.value) await target.importScene(source);
  } catch (reason) { if (ticket === generation) report(reason); }
  finally { if (ticket === generation) busy.value = false; }
}
const handle: WhiteboardEditorHandle = {
  /** @returns Source-bound snapshot from the live runtime. */
  async snapshot() { if (!runtime.value) throw new WhiteboardError("notReady", "白板尚未加载完成"); if (draft.blocked.value) throw new WhiteboardError("recoveryRequired", "请先恢复或丢弃本机草稿"); return runtime.value.snapshot(); },
  /** @returns Checkpoint cleanup after explicit host acceptance/discard. */
  async clearDraft() { return draft.clear(); },
  /** Restores canvas input focus. */
  focus() { runtime.value?.focus(); },
};
defineExpose(handle);
onMounted(() => { void mount(); });
watch([() => props.document, () => props.drafts], () => { void mount(); });
watch(readOnly, value => runtime.value?.setReadOnly(value), { flush: "sync" });
watch(draft.blocked, value => emit("draftPending", value), { flush: "sync" });
watch(locale, value => runtime.value?.setLocale(value));
watch(() => theme.value.scheme, value => runtime.value?.setTheme(value));
watch(dirty, value => {
  releaseLeave?.(); releaseLeave = undefined;
  const owner = container.value?.ownerDocument.defaultView;
  if (value && owner) releaseLeave = guardWhiteboardLeave(owner);
}, { flush: "sync" });
onBeforeUnmount(() => { generation++; draft.stop(); releaseLeave?.(); abort?.abort(); runtime.value?.destroy(); });
</script>

<template>
  <QuireThemeProvider :theme="theme"><QuireIconProvider :registry="quireIconRegistry">
    <section class="qk-whiteboard-editor" :lang="locale" :aria-label="text.workspace" :aria-busy="loading || busy">
      <header class="qk-whiteboard-editor__header">
        <div v-if="!embedded" class="qk-whiteboard-editor__identity"><QuireIcon name="edit" :size="20" /><h1>{{ document.title }}</h1></div>
        <div class="qk-whiteboard-editor__toolbar"><QuireToolbar :label="text.files" :items="toolbar" variant="plain" align="start" overflow="scroll" preserve-focus @execute="execute" /></div>
        <div v-if="!embedded || $slots.actions" class="qk-whiteboard-editor__actions">
          <span v-if="!embedded && ($slots.status || readOnly || dirty)" class="qk-whiteboard-editor__status" role="status"><slot name="status">{{ readOnly ? text.readOnly : text.unsaved }}</slot></span>
          <slot name="actions" />
        </div>
      </header>
      <input ref="input" type="file" accept=".excalidraw,.json,application/json" hidden @change="importFile" />
      <DraftPanel :state="draft.state.value" :disabled="!!props.readOnly || draft.working.value || !runtime" :error="draft.error.value" @restore="draft.restore" @discard="draft.discard" @download="draft.download" />
      <div v-if="pendingImport" class="qk-whiteboard-editor__import-confirm" role="alert">
        <span>{{ text.importWarning }}</span>
        <QuireButton variant="ghost" @click="pendingImport = undefined">{{ text.keep }}</QuireButton>
        <QuireButton variant="outline" :disabled="readOnly || busy" @click="loadFile(pendingImport)">{{ text.replace }}</QuireButton>
      </div>
      <div class="qk-whiteboard-editor__workspace">
        <div ref="container" class="qk-whiteboard-editor__surface" />
        <div v-if="loading || draft.working.value" class="qk-whiteboard-editor__loading" role="status">{{ draft.working.value ? text.processingDraft : text.loading }}</div>
        <div v-if="error" class="qk-whiteboard-editor__error" role="alert">{{ failure(error) }}</div>
      </div>
      <footer class="qk-whiteboard-editor__footer"><span :class="{ 'qk-whiteboard-editor__backup': draft.message.value }" :role="draft.message.value ? 'status' : undefined">{{ draft.message.value || text.hint }}</span><QuireToolbar :label="text.view" :items="viewport" preserve-focus @execute="execute" /></footer>
    </section>
  </QuireIconProvider></QuireThemeProvider>
</template>
