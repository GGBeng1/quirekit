<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import { useMindPreviewPreferences } from "./preferences/session";
import PreferenceControls from "./preferences/controls.vue";
import { mindEditorTranslator } from "../src/locale/resolve";
import { mindEditorError } from "../src/locale/errors";
import { QuireButton, QuireDialogContent, QuireDialogRoot, QuireLocaleProvider } from "@quirekit/ui/vue";
import { parseMindMap, serializeMindMap } from "@quirekit/mind-map";
import type { MindMapEditor } from "@quirekit/mind-map-simple";
import { QuireMindEditor } from "@quirekit/mind-editor/vue";
import type { MindEditorHandle } from "../src/vue/types";
import { initialDocument } from "./document";
const storageKey = "quirekit-mind-editor-preview-v1";
const { locale, appearance, theme } = useMindPreviewPreferences();
const t = computed(() => mindEditorTranslator(locale.value));
const source = shallowRef(initialDocument);
const editor = shallowRef<MindMapEditor>();
const saved = ref(false), saving = ref(false), error = ref("");
const workbench = ref<MindEditorHandle>(), recoveryPending = ref(false);
const recovery = { namespace: "quire-mind-preview", documentId: storageKey, targetId: "standalone" };
try { const stored = localStorage.getItem(storageKey); if (stored) source.value = parseMindMap(stored); } catch { /* Invalid preview data never replaces a valid document. */ }
/** @returns Completion of the explicit preview-host local save. */
async function save(): Promise<void> {
  if (!editor.value) return;
  saving.value = true;
  try {
    const document = await editor.value.getDocument();
    localStorage.setItem(storageKey, serializeMindMap(document));
    await workbench.value?.acceptRecoverySave(document); saved.value = true; error.value = "";
  }
  catch (reason) { error.value = mindEditorError(reason, locale.value); }
  finally { saving.value = false; }
}
</script>
<template>
  <QuireLocaleProvider :locale="locale">
  <QuireMindEditor ref="workbench" :document="source" :theme="theme" :recovery="recovery" @ready="editor = $event" @change="saved = false" @recovery-pending="recoveryPending = $event">
    <template #actions>
      <QuireDialogRoot :open="!!error" role="alertdialog" :close-on-interact-outside="false" @update:open="open => { if (!open) error = ''; }">
        <QuireDialogContent :title="t('saveLocalFailed')" size="small" :description="error">
          <template #footer><QuireButton size="sm" @click="error = ''">{{ t('dismiss') }}</QuireButton></template>
        </QuireDialogContent>
      </QuireDialogRoot>
      <PreferenceControls v-model:locale="locale" v-model:appearance="appearance" />
      <QuireButton size="sm" color="primary" variant="solid" :disabled="!editor || saving || recoveryPending" :title="t('saveLocalHint')" @click="save">{{ saved ? t('savedLocal') : t('saveLocal') }}</QuireButton>
    </template>
  </QuireMindEditor>
  </QuireLocaleProvider>
</template>
