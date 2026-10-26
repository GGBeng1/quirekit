<script setup lang="ts">
import { createTextDiagram, textDiagramMarkdown, type TextDiagramEmbed, type TextDiagramLanguage } from "@quirekit/text-diagram";
import { computed, defineAsyncComponent, onBeforeUnmount, ref, useId } from "vue";
import { QuireField, QuireTextarea, QuireButton } from "@quirekit/ui/vue";
import { isSafeDestination, type MsfeEditor } from "@quirekit/msfe-core";
import type { MathDocument } from "@quirekit/math";
import type { EditorState } from "@quirekit/cm-state";
import { editMdDestination, mdDestinationSource } from "../../commands/destination";
import { insertMarkdownBlock } from "../../commands/insert";
import { replaceMdPreview } from "../../commands/preview";
import DestinationFields from "./destination-fields.vue";
import LinkEditor from "./link.vue";
import TaskSurface from "./surface.vue";
import type { MdDialogIntent } from "./types";
import type { MdEditorLocale } from "../types";
import { mdEditorMessages } from "../messages";
import { mdMermaidEnabled, mdTextDiagramsEnabled } from "../../presentation/capabilities";
import { mdImageAlt, mdUploadImageTypes } from "../../images/source";
import type { MdImageStorage } from "../../images/types";
import type { MdDocumentLinkSource } from "../../commands/types";
import { v4 as uuidv4 } from "uuid";

const DiagramPanel = defineAsyncComponent(async () => {
  await import("@quirekit/text-diagram-editor/styles.css");
  return (await import("@quirekit/text-diagram-editor/vue")).TextDiagramEditor;
});
const MathPanel = defineAsyncComponent(async () => {
  await import("@quirekit/math-ui/styles.css");
  return (await import("@quirekit/math-ui")).MathAuthoringPanel;
});
const diagramPanel = ref<InstanceType<typeof DiagramPanel>>();
const props = defineProps<{
  /** Source owner, independent of the mounted preview. */ editor: MsfeEditor;
  /** Accepted state drives permission/conflict feedback only while this dialog is open. */ state: EditorState;
  /** Retained source identity and initial draft. */ intent: MdDialogIntent;
  /** Shared control locale. */ locale: MdEditorLocale;
  /** Host image storage; shows the local upload action for images. */ images?: MdImageStorage | undefined;
  /** Host documents; links can be chosen by searching document titles. */ documents?: MdDocumentLinkSource | undefined;
}>();
const emit = defineEmits<{ /** Draft ended; parent clears the dialog. */ close: [] }>();
const text = computed(() => mdEditorMessages[props.locale]);
const body = ref(props.intent.body), url = ref(props.intent.url), label = ref(props.intent.label), title = ref(props.intent.title);
const error = ref(""), surface = ref<HTMLElement>(), formId = useId();
const math = props.intent.kind === "inlineMath" || props.intent.kind === "displayMath";
const diagram = props.intent.kind === "mermaid" || props.intent.kind === "textDiagram";
const languages = computed<TextDiagramLanguage[]>(() => [
  ...(props.state.facet(mdMermaidEnabled) ? ["mermaid" as const] : []),
  ...(props.state.facet(mdTextDiagramsEnabled) ? ["plantuml" as const, "dot" as const] : []),
]);
const diagramRequest = diagram ? { document: createTextDiagram(uuidv4(), props.intent.language ?? "mermaid", props.intent.body),
  commit: commitDiagram,
  /** The dialog owns the source anchor and releases it on unmount. */
  release() {} } : undefined;
const destination = props.intent.kind === "image" || props.intent.kind === "link";
const invalid = computed(() => { void props.state; return props.editor.state.readOnly || !props.intent.anchor.target(); });
const dialogTitle = computed(() => text.value[props.intent.kind]);
const uploading = ref(false), fileInput = ref<HTMLInputElement>();
const uploads = new AbortController();
onBeforeUnmount(() => { props.intent.anchor.release(); uploads.abort(); });

/** @param event - Native file choice; the stored address fills the URL field for the user to confirm. */
async function upload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement, file = input.files?.[0];
  input.value = "";
  if (!file || !props.images || uploading.value) return;
  uploading.value = true; error.value = "";
  try {
    url.value = await props.images.upload(file, { signal: uploads.signal, source: "dialog", name: file.name });
    if (!label.value.trim()) label.value = mdImageAlt(file.name);
  } catch { if (!uploads.signal.aborted) error.value = text.value.uploadImageFailed; }
  finally { uploading.value = false; }
}

/** Preserve native document focus after the public overlay has closed. */
function close(): void { emit("close"); requestAnimationFrame(() => props.editor.focus()); }
/** @param source - Validated formula/diagram draft. @param language - Explicit diagram grammar. @returns Whether one host transaction was accepted. */
function saveBody(source: string, language: TextDiagramLanguage = "mermaid"): boolean {
  const target = props.intent.anchor.target();
  if (!target || props.editor.state.readOnly) { error.value = text.value.conflict; return false; }
  if (props.intent.insert) {
    const payload = props.intent.kind === "inlineMath" ? `$${source}$` : props.intent.kind === "displayMath" ? `$$\n${source}\n$$` : textDiagramMarkdown(language, source);
    const accepted = props.intent.insert(payload);
    if (!accepted) error.value = text.value.rejected;
    return accepted;
  }
  const command = props.intent.existing ? replaceMdPreview(source, diagram ? language : undefined)
    : props.intent.kind === "inlineMath" ? () => ({ changes: { from: target.selection.main.from, to: target.selection.main.to, insert: `$${source}$` } })
      : insertMarkdownBlock(props.intent.kind === "displayMath" ? `$$\n${source}\n$$`
        : diagram ? textDiagramMarkdown(language, source) : source);
  const accepted = props.editor.run(command, target).ok;
  if (!accepted) error.value = text.value.rejected;
  return accepted;
}
/** @param document - Exact source whose preview has succeeded. @returns Final source-anchor acceptance. */
function commitDiagram(document: TextDiagramEmbed): "saved" | "conflict" | "readonly" {
  if (props.editor.state.readOnly) return "readonly";
  if (!props.editor.state.facet(document.document.language === "mermaid" ? mdMermaidEnabled : mdTextDiagramsEnabled)) return "conflict";
  return saveBody(document.document.source, document.document.language) ? "saved" : "conflict";
}
/** @param document - Formula editor's validated exact LaTeX. @returns True only after the Markdown transaction succeeds. */
function commitMath(document: MathDocument): boolean {
  if (props.intent.kind === "inlineMath" && /\n|(?<!\\)\$/u.test(document.latex)) { error.value = text.value.inlineMathSingleLine; return false; }
  return saveBody(document.latex);
}
/** Commit destination or source fields without allowing a stale dialog to overwrite newer text. */
function submit(): void {
  error.value = "";
  if (!destination) {
    if (!body.value.trim() || props.intent.kind === "mermaid" && /^\s*`{3,}/mu.test(body.value)) { error.value = text.value.invalidBody; return; }
    if (saveBody(body.value)) close();
    return;
  }
  const target = props.intent.anchor.target(), image = props.intent.kind === "image";
  if (!target) { error.value = text.value.conflict; return; }
  if (!url.value.trim() || !isSafeDestination(url.value.trim(), image)) { error.value = text.value.invalidUrl; return; }
  const patch = { url: url.value.trim(), ...(label.value !== props.intent.label || !props.intent.existing ? { label: label.value } : {}),
    ...(title.value !== props.intent.title ? { title: title.value } : {}) };
  const payload = props.intent.insert ? mdDestinationSource(image, patch) : null;
  if (props.intent.insert ? payload && props.intent.insert(payload) : props.editor.run(editMdDestination(image, patch), target).ok) close();
  else error.value = text.value.rejected;
}
</script>
<template>
  <LinkEditor v-if="intent.kind === 'link'" :editor="editor" :state="state" :intent="intent" :locale="locale" :documents="documents" @close="close" />
  <TaskSurface v-else :owner="editor.element" :title="dialogTitle" :workspace="math || diagram" :size="math || diagram ? 'large' : 'medium'"
    :error="invalid ? text.conflict : error" @escape="diagramPanel?.handleEscape($event)" @close="close">
      <div ref="surface" class="flex flex-col gap-qk-group">
        <MathPanel v-if="math" :latex="intent.body" :commit="commitMath" :locale="locale" :popup-target="surface" autofocus @committed="close" @cancel="close" />
        <DiagramPanel v-else-if="diagramRequest" ref="diagramPanel" :request="diagramRequest" :owner-document="editor.element.ownerDocument" :locale="locale" :languages="languages" :title-editable="false" @saved="close" @cancel="close" />
        <form v-else-if="destination" :id="formId" @submit.prevent="submit">
          <DestinationFields v-model:url="url" v-model:label="label" v-model:title="title" :image="intent.kind === 'image'" :locale="locale" :documents="documents" />
          <div v-if="intent.kind === 'image' && images" class="mt-qk-group">
            <input ref="fileInput" type="file" class="hidden" :accept="mdUploadImageTypes.join(',')" @change="upload">
            <QuireButton variant="outline" :busy="uploading" :disabled="invalid" @click="fileInput?.click()">
              {{ uploading ? text.uploadingImage : text.uploadImage }}
            </QuireButton>
          </div>
        </form>
        <template v-else>
          <QuireField :label="text.diagramSource" width="100%" required>
            <template #default="{ controlProps }"><QuireTextarea v-bind="controlProps" v-model="body" :rows="10" width="100%" /></template>
          </QuireField>
        </template>
      </div>
      <template v-if="!math && !diagram" #footer>
        <QuireButton variant="text" @click="close">{{ text.cancel }}</QuireButton>
        <QuireButton :type="destination ? 'submit' : 'button'" :form="destination ? formId : undefined" :disabled="invalid || uploading" color="primary" @click="!destination && submit()">{{ text.confirm }}</QuireButton>
      </template>
  </TaskSurface>
</template>
