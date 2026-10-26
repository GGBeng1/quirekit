<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { createTheme, quireIconRegistry, type QuireKitMenuEntry } from "@quirekit/ui";
import { QuireButton, QuireIcon, QuireIconButton, QuireIconProvider, QuireThemeProvider, QuireLocaleProvider, QuireMenu, QuireTooltipContent, QuireTooltipRoot, QuireTooltipTrigger } from "@quirekit/ui/vue";
import { createWhiteboardDocument, parseWhiteboard, prepareWhiteboardSave, serializeWhiteboard, type WhiteboardDocument } from "@quirekit/whiteboard";
import { WhiteboardEditor, type WhiteboardEditorHandle } from "../src/vue";
import { whiteboardErrorMessage } from "../src/locale/resolve";
import type { WhiteboardEditor as Runtime } from "@quirekit/whiteboard-excalidraw";
const localeKey = "quirekit-whiteboard-demo:locale";
/** @returns Persisted UI preference independently of any drawing source. */
function initialLocale(): string { try { return localStorage.getItem(localeKey) === "en" ? "en" : "zh-CN"; } catch { return "zh-CN"; } }
const locale = ref(initialLocale());
watch(locale, value => { try { localStorage.setItem(localeKey, value); } catch { /* Language changes remain usable without storage. */ } });
const en = computed(() => locale.value === "en");
const failure = shallowRef<unknown>();
const failureText = computed(() => whiteboardErrorMessage(failure.value, locale.value));
const key = "quirekit-whiteboard-demo:v1";
const drafts = { namespace: "whiteboard-demo", documentId: key };
const draftPending = ref(false);
/** @returns Saved source or a fresh independent board. */
function initial(): WhiteboardDocument { try { const text = localStorage.getItem(key); if (text) return parseWhiteboard(text); } catch { /* A storage failure leaves the drawing usable. */ } return createWhiteboardDocument("standalone-whiteboard", "灵感白板"); }
const document = shallowRef(initial()), editor = ref<WhiteboardEditorHandle>(), dark = ref(false), saving = ref(false), status = ref("draft");
const theme = computed(() => createTheme({ scheme: dark.value ? "dark" : "light" }));
const openSwitch = ref<string>();
const switches = computed(() => {
  const appearance = en.value ? "Appearance" : "外观", language = en.value ? "Interface language" : "界面语言";
  const light = en.value ? "Light" : "浅色", night = en.value ? "Dark" : "深色", separator = en.value ? ": " : "：";
  return [{
    id: "theme", icon: dark.value ? "moon" : "sun", label: appearance,
    title: `${appearance}${separator}${dark.value ? night : light}`, select: selectTheme,
    items: [{ value: "theme", kind: "radio-group", label: appearance, selectedValue: dark.value ? "dark" : "light",
      children: [{ value: "light", label: light }, { value: "dark", label: night }] }] satisfies readonly QuireKitMenuEntry[],
  }, {
    id: "locale", icon: "languages", label: language,
    title: `${language}${separator}${en.value ? "English" : "中文"}`, select: selectLocale,
    items: [{ value: "locale", kind: "radio-group", label: language, selectedValue: locale.value,
      children: [{ value: "zh-CN", label: "中文" }, { value: "en", label: "English" }] }] satisfies readonly QuireKitMenuEntry[],
  }];
});
/** @param id - Product setting whose menu changed. @param value - Visibility managed by the public menu. */
function setSwitchOpen(id: string, value: boolean | undefined): void {
  if (value) openSwitch.value = id;
  else if (openSwitch.value === id) openSwitch.value = undefined;
}
/** @param value - Selected appearance choice. */
function selectTheme(value: string): void {
  if (value !== "light" && value !== "dark") return;
  openSwitch.value = undefined; dark.value = value === "dark";
}
/** @param value - Selected interface language, independent of drawing content. */
function selectLocale(value: string): void {
  if (value !== "zh-CN" && value !== "en") return;
  openSwitch.value = undefined; locale.value = value;
}
/** Saves editable source and its exact preview through the same boundary as embedded editors. */
async function save(): Promise<void> {
  if (!editor.value || saving.value) return; saving.value = true;
  try { const result = await editor.value.snapshot(); const next = prepareWhiteboardSave(document.value, result.scene, result.preview); localStorage.setItem(key, serializeWhiteboard(next)); await editor.value.clearDraft(); document.value = next; status.value = "saved"; }
  catch (error) { failure.value = error; status.value = "failed"; } finally { saving.value = false; }
}
/** @param runtime - Public adapter used by acceptance tests. */
function ready(runtime: Runtime): void { (window as Window & { whiteboardDemo?: Runtime }).whiteboardDemo = runtime; }
onBeforeUnmount(() => { delete (window as Window & { whiteboardDemo?: Runtime }).whiteboardDemo; });
</script>
<template>
  <QuireLocaleProvider :locale="locale"><QuireThemeProvider :theme="theme"><QuireIconProvider :registry="quireIconRegistry">
    <main class="preview" :lang="locale">
      <WhiteboardEditor ref="editor" :document="document" :drafts="drafts" :theme="theme" :read-only="saving" @ready="ready" @change="status = 'dirty'" @draft-pending="draftPending = $event">
        <template #status>{{ status === "draft" ? (en ? "Local draft" : "本地草稿") : status === "saved" ? (en ? "Saved locally" : "已保存到本机") : status === "dirty" ? (en ? "Unsaved changes" : "有未保存的修改") : failureText }}</template>
        <template #actions>
          <div class="preview__switches">
            <!-- The tooltip shares the menu trigger id so its anchor and focus return stay on one icon button. -->
            <QuireTooltipRoot v-for="control in switches" :key="control.id" :trigger-id="`menu:qk-whiteboard-switch-${control.id}:trigger`" :disabled="openSwitch === control.id" :open-delay="420" placement="bottom">
              <QuireMenu :id="`qk-whiteboard-switch-${control.id}`" :items="control.items" :aria-label="control.label" :lang="locale" :open="openSwitch === control.id" placement="bottom-end" min-width="128px" @update:open="setSwitchOpen(control.id, $event)" @select="control.select">
                <template #trigger>
                  <QuireTooltipTrigger as-child>
                    <QuireIconButton :label="control.title" variant="ghost" size="sm"><QuireIcon :name="control.icon" :size="16" /></QuireIconButton>
                  </QuireTooltipTrigger>
                </template>
              </QuireMenu>
              <QuireTooltipContent :content="control.title" />
            </QuireTooltipRoot>
          </div>
          <QuireButton variant="solid" color="primary" :disabled="saving || draftPending" @click="save">{{ en ? "Save locally" : "保存到本机" }}</QuireButton>
        </template>
      </WhiteboardEditor>
    </main>
  </QuireIconProvider></QuireThemeProvider></QuireLocaleProvider>
</template>
<style>
html,body,#app { margin:0; height:100%; } .preview { height:100dvh; display:flex; flex-direction:column; background:var(--qk-color-surface-page); color:var(--qk-color-text-primary); font-family:var(--qk-type-body-font-family); }
.preview>.qk-whiteboard-editor { min-height:0; flex:1; }
.preview__switches { display:flex; align-items:center; gap:var(--qk-space-inline-tight); }
</style>
