<script setup lang="ts">
import { computed, createApp, ref, shallowRef, watch, type App } from "vue";
import { createTheme } from "@quirekit/ui";
import { QuireLocaleProvider, QuireButton, QuireIcon, QuireIconButton } from "@quirekit/ui/vue";
import { createFlowchartDraft, parseFlowchart, readFlowchart, serializeFlowchart } from "@quirekit/flowchart";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
import { QuireFlowEditor } from "@quirekit/flow-editor/vue";
import { createFlowEditor, createFlowchartTemplate, flowEditorText, resolveFlowLocale } from "@quirekit/flow-editor";
import LocaleControl from "./controls/locale.vue";
import PresentationConsumer from "./presentation-consumer.vue";
import type { FlowFixture } from "./types";
import { createFlowchartPlaybackExample } from "./examples/reference";
import { createFlowchartAttentionExample } from "./examples/attention/example";
import { createFlowchartResidualExample } from "./examples/residual/example";
import { v4 as uuidv4 } from "uuid";

const localeKey = "quirekit-flow-editor-locale";
let preference = "zh-CN";
try { preference = localStorage.getItem(localeKey) ?? preference; } catch { /* Storage may be unavailable; language remains session-local. */ }
const locale = ref(resolveFlowLocale(preference));
watch(locale, value => { try { localStorage.setItem(localeKey, value); } catch { /* Keep the in-memory preference. */ } });
/** @param source - Host UI message. @returns Current display text. */
const t = (source: string) => flowEditorText(locale.value, source);
const key = "quirekit-flow-editor-preview-v1";
let committed = createFlowchartTemplate("approval", "publish", locale.value);
try { const stored = localStorage.getItem(key); if (stored) committed = parseFlowchart(stored); } catch { /* Invalid saved data does not overwrite a valid initial graph. */ }
const source = shallowRef(committed), editor = shallowRef<FlowchartEditor>();
const scheme = ref<"light" | "dark">("light"), readOnly = ref(false), saving = ref(false), message = ref("");
const theme = computed(() => createTheme({ scheme: scheme.value }));
let invalidations = 0;
let presentationApp: App | undefined, presentationRoot: HTMLElement | undefined;
/** @returns Completion of one explicit preview-host transaction. */
async function save(): Promise<void> {
  if (!editor.value) return;
  saving.value = true;
  const draft = createFlowchartDraft("preview-flow", source.value);
  try {
    draft.replace(await editor.value.getDocument());
    const result = draft.save(request => {
      if (readOnly.value) return "readonly";
      if (request.expectedRevision !== committed.revision) return "conflict";
      localStorage.setItem(key, serializeFlowchart(request.document)); committed = request.document; return "saved";
    });
    if (result === "saved") { source.value = committed; message.value = "已保存到本机"; }
    else message.value = `保存失败：${result}`;
  } catch (reason) { message.value = reason instanceof Error ? reason.message : String(reason); }
  finally { saving.value = false; }
}
/** Reopens the committed source without writing host storage. */
function cancel(): void { source.value = readFlowchart(committed); message.value = "已取消修改"; }
// Only this verification host exposes controllers; published components have no global hooks.
const fixture: FlowFixture = {
  /** @param kind - Consumer-owned illustrative graph. @param language - Language of sample content. Loads one ordinary history entry only on explicit test intent. */
  async loadExample(kind, language = locale.value) {
    const owner = editor.value!, before = await owner.getDocument(); if (owner !== editor.value) return;
    const example = (kind === "attention" ? createFlowchartAttentionExample : kind === "residual" ? createFlowchartResidualExample : createFlowchartPlaybackExample)(language, `fixture-${uuidv4()}`);
    owner.playback.close(); owner.replaceDocument({ ...example.document, revision: before.revision }); owner.playback.load(example.trace); owner.fit();
  },
  create: createFlowEditor,
  /** @param value - Simulates a reactive host preference while native input is active. */ setLocale: value => { locale.value = resolveFlowLocale(value); },
  /** @returns Current neutral controller. */ editor: () => editor.value!,
  /** @returns Last host commit. */ committed: () => committed,
  /** @returns Event count without document serialization. */ invalidations: () => invalidations,
  /** @param document - Canonical source. @param playback - Host-defined sequence. @returns Mounted public presentation controller. */
  mountPresentation(document, playback) {
    fixture.disposePresentation(); presentationRoot = window.document.createElement("div"); presentationRoot.dataset.presentationConsumer = "";
    presentationRoot.style.cssText = "position:fixed;inset:0;z-index:100;background:white"; window.document.body.append(presentationRoot);
    return new Promise(resolve => {
      presentationApp = createApp(PresentationConsumer, { document, playback, onReady: resolve });
      presentationApp.mount(presentationRoot!);
    });
  },
  /** Releases this fixture's Vue and graph lifetimes. */
  disposePresentation() { presentationApp?.unmount(); presentationApp = undefined; presentationRoot?.remove(); presentationRoot = undefined; },
};
Object.assign(window, { flowFixture: fixture });
</script>
<template>
  <QuireLocaleProvider :locale="locale"><QuireFlowEditor :document="source" :theme="theme" :read-only="readOnly" title="QuireKit Flow Editor" @ready="editor = $event" @change="invalidations++; message = ''">
    <template #actions>
      <span v-if="message" role="status" style="font-size:12px">{{ t(message) }}</span>
      <QuireIconButton :label="t('切换明暗主题')" variant="ghost" size="sm" @click="scheme = scheme === 'light' ? 'dark' : 'light'"><QuireIcon :name="scheme === 'light' ? 'sun' : 'moon'" :size="16" /></QuireIconButton>
      <LocaleControl :locale="locale" @select="locale = resolveFlowLocale($event)" />
      <QuireIconButton :label="t(readOnly ? '允许编辑' : '切换只读')" variant="ghost" size="sm" @click="readOnly = !readOnly"><QuireIcon :name="readOnly ? 'lock' : 'lockOpen'" :size="16" /></QuireIconButton>
      <QuireButton size="sm" variant="ghost" :disabled="saving" @click="cancel">{{ t('取消修改') }}</QuireButton>
      <QuireButton size="sm" color="primary" variant="solid" :disabled="!editor || saving || readOnly" @click="save">{{ t('保存到本机') }}</QuireButton>
    </template>
  </QuireFlowEditor></QuireLocaleProvider>
</template>
