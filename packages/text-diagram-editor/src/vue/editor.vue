<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { QuireButton, QuireField, QuireInput, QuireSelect } from "@quirekit/ui/vue";
import { prepareTextDiagramSave, textDiagramLanguage, textDiagramTemplates, type TextDiagramEditRequest, type TextDiagramLanguage, type TextDiagramSnapshot } from "@quirekit/text-diagram";
import { renderTextDiagram, rasterizeTextDiagram } from "@quirekit/text-diagram/browser";
import { textDiagramMessages } from "../locale/messages";
import DiagramSource from "./source.vue";

const props = defineProps<{
  /** Immutable baseline and host commit authority. */ request: TextDiagramEditRequest;
  /** Locale for controls and newly selected templates. */ locale?: string;
  /** Explicit DOM owner for independent products. */ ownerDocument: Document;
  /** Grammars installed by the host; omitted means all three. */ languages?: readonly TextDiagramLanguage[];
  /** Hide title editing when the host format only persists a language and source. */ titleEditable?: boolean;
}>();
const emit = defineEmits<{ /** Host accepted one atomic save. */ saved: []; /** Draft cancelled. */ cancel: [] }>();
const t = computed(() => textDiagramMessages(props.locale));
const initial = props.request.document;
const language = ref<TextDiagramLanguage>(initial.document.language), source = ref(initial.document.source), title = ref(initial.title);
const templates = computed(() => textDiagramTemplates(props.locale).filter(item => item.language === language.value));
const template = ref(templates.value[0]!.id);
const templateItems = computed(() => templates.value.map(item => ({ value: item.id, label: item.label })));
const languages = computed(() => ([{ value: "mermaid", label: "Mermaid" }, { value: "plantuml", label: "PlantUML" }, { value: "dot", label: "Graphviz / DOT" }] as const)
  .filter(item => !props.languages || props.languages.includes(item.value)));
const snapshot = shallowRef<TextDiagramSnapshot>(), previewUrl = ref(""), pending = ref(false), busy = ref(false), error = ref(""), detail = ref("");
const drafts = new Map<TextDiagramLanguage, string>();
const lifetime = new AbortController();
let render: AbortController | undefined, timer: ReturnType<typeof setTimeout> | undefined;
const composing = ref(false);
const sourceEditor = ref<InstanceType<typeof DiagramSource>>(), sourceLimit = ref(false);
const current = computed(() => snapshot.value?.language === language.value && snapshot.value?.source === source.value && languages.value.some(item => item.value === language.value));
/** Releases the old projection as soon as its source is changed. */
function retire(): void {
  clearTimeout(timer); render?.abort(); snapshot.value = undefined;
  if (previewUrl.value) props.ownerDocument.defaultView!.URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = "";
}
/** Render one source identity; cancelled results never update a newer draft. */
async function refresh(): Promise<void> {
  retire(); const job = new AbortController(); render = job; pending.value = true; error.value = ""; detail.value = "";
  try {
    const result = await renderTextDiagram(language.value, source.value, { signal: job.signal, ownerDocument: props.ownerDocument });
    if (job.signal.aborted) return;
    snapshot.value = result; previewUrl.value = props.ownerDocument.defaultView!.URL.createObjectURL(new Blob([result.svg], { type: "image/svg+xml" }));
  } catch (reason) {
    if (!job.signal.aborted) { error.value = t.value.error; detail.value = (reason instanceof Error ? reason.message : String(reason)).slice(0, 1000); }
  } finally { if (!job.signal.aborted) pending.value = false; }
}
/** @param value - Explicit user-selected grammar. */
function changeLanguage(value: string | undefined): void {
  const next = textDiagramLanguage(value ?? ""); if (!next || next === language.value) return;
  const names = { mermaid: "Mermaid", plantuml: "PlantUML", dot: "Graphviz" };
  if (title.value === names[language.value]) title.value = names[next];
  drafts.set(language.value, source.value); language.value = next;
  source.value = drafts.get(next) ?? templates.value[0]!.source; template.value = templates.value[0]!.id;
}
/** Applies a real example only following an explicit template action. */
function applyTemplate(): void { source.value = templates.value.find(item => item.id === template.value)!.source; }
/** Convert the current immutable preview, then synchronously recheck the host target. */
async function save(): Promise<void> {
  if (composing.value) { error.value = t.value.composing; return; }
  if (!current.value || !snapshot.value || busy.value) return;
  busy.value = true; error.value = "";
  try {
    const raster = await rasterizeTextDiagram(snapshot.value, props.ownerDocument, lifetime.signal);
    lifetime.signal.throwIfAborted();
    const result = props.request.commit(prepareTextDiagramSave(initial, raster, title.value));
    if (result === "saved") emit("saved"); else error.value = t.value[result];
  } catch (reason) { if (!lifetime.signal.aborted) { error.value = t.value.error; detail.value = String(reason); } }
  finally { busy.value = false; }
}
/** @param format - Exact preview output requested by the user. */
async function download(format: "svg" | "png"): Promise<void> {
  if (!current.value || !snapshot.value || busy.value) return;
  busy.value = true;
  try {
    const view = props.ownerDocument.defaultView!, link = props.ownerDocument.createElement("a");
    link.download = `${language.value}.${format}`;
    link.href = format === "svg" ? view.URL.createObjectURL(new Blob([snapshot.value.svg], { type: "image/svg+xml" }))
      : (await rasterizeTextDiagram(snapshot.value, props.ownerDocument, lifetime.signal)).dataUrl;
    lifetime.signal.throwIfAborted(); link.click();
    if (format === "svg") setTimeout(() => view.URL.revokeObjectURL(link.href), 1000);
  } catch (reason) { if (!lifetime.signal.aborted) { error.value = t.value.error; detail.value = String(reason); } }
  finally { busy.value = false; }
}
watch([language, source, composing], () => {
  retire(); pending.value = true;
  if (!composing.value) timer = setTimeout(() => { void refresh(); }, 400);
}, { immediate: true, flush: "sync" });
onBeforeUnmount(() => { lifetime.abort(); retire(); });
/** @param event - Host dialog Escape notification; source/search owns Escape while focused. */
function handleEscape(event: KeyboardEvent): void { sourceEditor.value?.handleEscape(event); }
defineExpose({ handleEscape });
</script>
<template>
  <div class="qk-text-diagram-editor" data-qk-text-diagram-editor @keydown.stop @compositionstart="composing = true" @compositionend="composing = false">
    <div class="qk-text-diagram-editor__toolbar">
      <QuireSelect :model-value="language" :items="languages" :label="t.language" :disabled="busy" width="170px" @update:model-value="changeLanguage" />
      <QuireSelect v-model="template" :items="templateItems" :label="t.template" :disabled="busy" width="160px" />
      <QuireButton variant="outline" :disabled="busy" @click="applyTemplate">{{ t.apply }}</QuireButton>
      <span class="qk-text-diagram-editor__spacer" />
      <QuireButton variant="ghost" :disabled="!current || busy" @click="download('svg')">{{ t.svg }}</QuireButton>
      <QuireButton variant="ghost" :disabled="!current || busy" @click="download('png')">{{ t.png }}</QuireButton>
    </div>
    <QuireField v-if="titleEditable !== false" :label="t.name" width="100%"><template #default="{ controlProps }"><QuireInput v-bind="controlProps" v-model="title" :disabled="busy" :maxlength="200" width="100%" /></template></QuireField>
    <div class="qk-text-diagram-editor__panes">
      <div class="qk-text-diagram-editor__source">
        <QuireField :label="t.source" :description="t.sourceHint" :invalid="sourceLimit" :error-text="t.sourceLimit" width="100%">
          <template #meta><QuireButton size="sm" variant="text" :disabled="busy" @click="sourceEditor?.search()">{{ t.find }}</QuireButton></template>
          <template #default="{ controlProps }"><DiagramSource ref="sourceEditor" v-model:source="source" :language="language" :locale="locale"
            :label="t.source" :id="controlProps.id" :described-by="controlProps['aria-errormessage'] ?? controlProps['aria-describedby']"
            :invalid="sourceLimit" :disabled="busy" @limit="sourceLimit = $event" /></template>
        </QuireField>
      </div>
      <section class="qk-text-diagram-editor__preview" :aria-label="t.preview" :aria-busy="pending">
        <img v-if="previewUrl" :src="previewUrl" :alt="title || t.preview" />
        <p v-else role="status">{{ pending ? t.loading : t.empty }}</p>
      </section>
    </div>
    <div v-if="error" class="qk-text-diagram-editor__error" role="alert">{{ error }}<pre v-if="detail">{{ detail }}</pre><QuireButton variant="outline" :disabled="busy" @click="refresh">{{ t.retry }}</QuireButton></div>
    <div class="qk-text-diagram-editor__footer">
      <small>{{ t.local }}</small><span class="qk-text-diagram-editor__spacer" />
      <QuireButton variant="text" :disabled="busy" @click="emit('cancel')">{{ t.cancel }}</QuireButton>
      <QuireButton color="primary" :disabled="!current || pending || busy || composing" :loading="busy" @click="save">{{ t.save }}</QuireButton>
    </div>
  </div>
</template>
<style>
.qk-text-diagram-editor { display:flex;flex-direction:column;gap:16px;min-width:0;color:var(--qk-color-text-primary); }
.qk-text-diagram-editor__toolbar,.qk-text-diagram-editor__footer { display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
.qk-text-diagram-editor__spacer { flex:1; }
.qk-text-diagram-editor__panes { display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px; }
.qk-text-diagram-editor__source,.qk-text-diagram-source { min-width:0; }
.qk-text-diagram-editor__preview { display:flex;align-items:center;justify-content:center;min-height:360px;max-height:480px;overflow:auto;background:white;border:1px solid var(--qk-color-border-subtle);border-radius:8px;padding:16px; }
.qk-text-diagram-editor__preview img { display:block;max-width:100%;height:auto; }
.qk-text-diagram-editor__preview p { color:#64748b; }
.qk-text-diagram-editor__footer small { color:var(--qk-color-text-tertiary); }
.qk-text-diagram-editor__error { color:var(--qk-color-text-primary); }
.qk-text-diagram-editor__error pre { max-height:100px;overflow:auto;white-space:pre-wrap;font-size:12px; }
@media (max-width:720px) { .qk-text-diagram-editor__panes { grid-template-columns:1fr; }.qk-text-diagram-source { --qk-diagram-source-height:260px; }.qk-text-diagram-editor__preview { min-height:200px;max-height:300px; } }
</style>
