<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { readExportTemplate, resolveExportTemplate } from '@quirekit/export-template';
import { QuireButton, QuireCollapsible } from "@quirekit/ui/vue";
import type { MsfeEditor } from "@quirekit/msfe-core";
import type { EditorState } from "@quirekit/cm-state";
import { linkifyTextLinks } from "@quirekit/msfe-link";
import type { MdDocxConverter, MdDocxDiagnostic, MdDocxPolicy } from '../../docx/types';
import type { MdEditorExtensionOptions } from '../../types';
import type { MdEditorLocale } from "../types";
import type { MdFileIntent, MdImportAction } from "./types";
import { mdEditorMessages } from "../messages";
import { commitFileImport } from "./intent";
import { getMdCommentsBridge } from "../comments/bridge";
import { wordReport } from "./report";
import { fileExportPresentation } from "./presentation";
import { mdExportFileName } from "./name";
import ImportSource from "./source.vue";
import TaskSurface from "../dialogs/surface.vue";

const props = defineProps<{
  /** Canonical source owner. */ editor: MsfeEditor;
  /** Permission and source feedback while the dialog is mounted. */ state: EditorState;
  /** Explicit user action and source ownership. */ intent: MdFileIntent;
  /** Host image, template and loss policy. */ options: MdDocxPolicy;
  /** Host-installed Word converter; absent when only format exporters are installed. */ converter?: MdDocxConverter | undefined;
  /** Installed product syntax used to select default codecs. */ features: MdEditorExtensionOptions;
  /** Product control language. */ locale: MdEditorLocale;
  /** Whether a host-installed picker can change the snapshot's appearance. */ templatePicker?: boolean;
}>();
const emit = defineEmits<{ /** Discard temporary resources and drafts. */ close: []; /** Open the host template picker. */ template: [] }>();
const text = computed(() => mdEditorMessages[props.locale]);
const presentation = computed(() => fileExportPresentation(props.intent, props.locale));
const importing = props.intent.mode === 'wordImport' || props.intent.mode === 'markdownImport', word = props.intent.mode !== "markdownImport";
const surface = ref<HTMLElement>(), pageCount = ref<number>();
const body = ref(""), error = ref(""), busy = ref(false), ready = ref(!word);
const data = shallowRef<Uint8Array>(), diagnostics = shallowRef<readonly MdDocxDiagnostic[]>([]);
const templateName = ref(text.value.defaultExportStyle), notice = ref("");
const initialOptions = { ...props.options }, initialFeatures = { ...props.features }, converter = props.converter;
let generation = 0;
let operation: AbortController | undefined;
const invalid = computed(() => {
  void props.state;
  return importing && (props.editor.state.readOnly || !props.intent.anchor?.target());
});
/** Comment marks in a Markdown draft become stand-off comments when the host enabled CriticMarkup import. */
const reviewMarks = computed(() => importing && !word && body.value.includes("{>>") && !!getMdCommentsBridge(props.editor)?.importsReview());
const blocked = computed(() => busy.value || !ready.value || invalid.value || !!error.value || !body.value.trim());
const losses = computed(() => diagnostics.value.filter(item => item.severity === "warning"));
const report = computed(() => wordReport(diagnostics.value, props.locale, props.intent.exporter));
onBeforeUnmount(() => { generation++; operation?.abort(); props.intent.anchor?.release(); });
onMounted(() => {
  if (!importing) void convert();
  // The installed converter or exporter may describe its own licensing state.
  const provider = props.intent.exporter ?? (word ? converter : undefined);
  void provider?.notice?.(props.locale).then((value) => { notice.value = value ?? ""; }, () => {});
});
watch(() => props.intent.templateReference, (next, previous) => { if (!importing && next !== previous) void convert(); });

/** End the file draft and restore the canonical editor's focus. */
function close(): void { generation++; operation?.abort(); emit("close"); requestAnimationFrame(() => props.editor.focus()); }
/** @param file - User-selected Word file; absence converts the captured export snapshot.
 * @returns Completion without editing source or starting a download. */
async function convert(file?: File): Promise<void> {
  const token = ++generation;
  operation?.abort(); operation = new AbortController();
  const signal = operation.signal;
  error.value = ""; busy.value = true; ready.value = false; data.value = undefined; diagnostics.value = []; body.value = ""; pageCount.value = undefined;
  try {
    let template = initialOptions.template;
    const reference = props.intent.templateReference, provider = props.intent.templateProvider;
    if (!file && reference && provider) {
      try {
        const selected = await readExportTemplate(provider, reference, signal);
        template = resolveExportTemplate(selected.style);
        if (token !== generation) return;
        templateName.value = selected.id === 'quirekit-default' ? text.value.defaultExportStyle : selected.name;
      } catch (cause) { if (!signal.aborted) error.value = text.value.unavailableExportStyle; throw cause; }
    }
    if (token !== generation) return;
    // Converters and exporters load their codecs only for this explicit action.
    const request = { policy: { ...initialOptions, ...(template ? { template: resolveExportTemplate(template) } : {}) }, features: initialFeatures, signal };
    // Text-link rules that opt into export write their matches as real links in the exported copy.
    const source = file || !props.intent.state ? props.intent.markdown : await linkifyTextLinks(props.intent.state, signal);
    if (token !== generation) return;
    const exporter = props.intent.exporter;
    if (!exporter && !converter) throw new Error("Word converter is not installed.");
    const result = file ? await converter!.importDocx(new Uint8Array(await file.arrayBuffer()), request)
      : exporter ? await exporter.export(source, request, { signal, ownerDocument: surface.value!.ownerDocument })
      : await converter!.exportDocx(source, request);
    if (token !== generation) return;
    diagnostics.value = result.diagnostics;
    if ("markdown" in result) body.value = result.markdown;
    else data.value = result.data;
    if ('pageCount' in result && typeof result.pageCount === 'number') pageCount.value = result.pageCount;
    ready.value = true;
  } catch (cause) {
    if (token !== generation) return;
    if (cause instanceof Error && "diagnostics" in cause) diagnostics.value = cause.diagnostics as readonly MdDocxDiagnostic[];
    error.value ||= initialOptions.lossPolicy === "strict" && diagnostics.value.length ? text.value.wordStrictError : presentation.value.error;
  } finally { if (token === generation) busy.value = false; }
}
/** @param file - Validated local file, or undefined after removal.
 * @returns Completion of a draft-only read; older asynchronous results are discarded. */
async function choose(file?: File): Promise<void> {
  const token = ++generation;
  operation?.abort();
  error.value = ""; body.value = ""; diagnostics.value = []; busy.value = false; ready.value = !word;
  if (!file) return;
  if (word) { await convert(file); return; }
  busy.value = true; ready.value = false;
  try {
    const source = await file.text();
    if (token !== generation) return;
    body.value = source.replace(/^\uFEFF/u, "").replace(/\r\n?/gu, "\n"); ready.value = true;
  } catch { if (token === generation) error.value = text.value.fileError; }
  finally { if (token === generation) busy.value = false; }
}
/** @param action - Explicit whole-source replacement or append chosen by the user. @returns Completion after commit. */
async function apply(action: MdImportAction): Promise<void> {
  if (blocked.value) return;
  const token = generation;
  busy.value = true;
  const review = await (getMdCommentsBridge(props.editor)?.readReview(body.value) ?? Promise.resolve(null)).catch(() => null);
  busy.value = false;
  if (token !== generation) return;
  if (!commitFileImport(props.editor, props.intent, review?.markdown ?? body.value, action)) { error.value = text.value.rejected; return; }
  review?.merge();
  close();
}
/** Download the already reviewed snapshot without mutating the editor. */
function download(): void {
  if (!ready.value || busy.value || !data.value) return;
  const url = URL.createObjectURL(new Blob([Uint8Array.from(data.value)], { type: presentation.value.mime }));
  const link = document.createElement("a"); link.href = url; link.download = mdExportFileName(props.editor, presentation.value.extension); link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  close();
}
</script>
<template>
  <TaskSurface :owner="editor.element" :title="importing ? word ? text.wordImport : text.markdown : presentation.title" size="large"
    :error="invalid ? text.importConflict : error" @close="close">
      <div ref="surface" class="flex min-w-0 flex-col gap-qk-inline [&_p]:m-0" :aria-busy="busy">
        <p class="text-qk-text-secondary">{{ importing ? word ? text.wordImportHint : text.markdownImportHint : presentation.hint }}</p>
        <p v-if="notice" class="qk-type-helper text-qk-text-tertiary" data-md-file-notice>{{ notice }}</p>
        <div v-if="!importing" class="flex items-center gap-qk-inline">
          <p>{{ text.exportStyle }}：{{ templateName }}</p>
          <QuireButton v-if="templatePicker" size="xs" variant="text" @click="emit('template')">{{ text.changeExportStyle }}</QuireButton>
        </div>
        <ImportSource v-if="importing" v-model="body" :word="word" :locale="locale" :disabled="busy || !ready" @choose="choose" />
        <p v-if="reviewMarks" role="status">{{ text.criticMarkupFound }}</p>
        <p v-if="busy" role="status" class="text-qk-text-secondary">{{ importing ? word ? text.wordConverting : text.fileReading : presentation.converting }}</p>
        <div v-else-if="word && (ready || diagnostics.length)" role="status" class="flex flex-col gap-qk-inline">
          <p>
            {{ losses.length ? `${text.wordReport} (${losses.length})` : text.wordNoLoss }}<template v-if="pageCount !== undefined">
              <span class="text-qk-text-tertiary"> · </span>{{ text.exportPages.replace('{count}', String(pageCount)) }}</template>
          </p>
          <QuireCollapsible v-if="diagnostics.length" :title="text.wordReportDetails" size="sm" variant="outline">
            <ul class="m-0 flex max-h-48 flex-col gap-1 overflow-auto pl-5 qk-type-helper text-qk-text-secondary">
              <li v-for="(item, index) in report" :key="index">{{ item }}</li>
            </ul>
          </QuireCollapsible>
        </div>
      </div>
      <template #footer>
        <QuireButton variant="text" @click="close">{{ text.cancel }}</QuireButton>
        <template v-if="importing">
          <QuireButton :disabled="blocked" @click="apply('replace')">{{ text.replaceDocument }}</QuireButton>
          <QuireButton color="primary" :disabled="blocked" @click="apply('append')">{{ text.appendDocument }}</QuireButton>
        </template>
        <template v-else>
          <QuireButton v-if="error" variant="text" @click="convert()">{{ text.wordRetry }}</QuireButton>
          <QuireButton color="primary" :disabled="busy || !ready" @click="download">{{ presentation.download }}</QuireButton>
        </template>
      </template>
  </TaskSurface>
</template>
