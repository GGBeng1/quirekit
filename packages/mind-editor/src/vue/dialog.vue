<script setup lang="ts">
import { useMindEditorMessages } from "./messages";
import { computed, onBeforeUnmount, ref, shallowRef } from "vue";
import { createTheme, quireIconRegistry } from "@quirekit/ui";
import { QuireButton, QuireDialogContent, QuireDialogRoot, QuireIconProvider, QuireThemeProvider } from "@quirekit/ui/vue";
import { prepareMindMapSave } from "@quirekit/mind-map";
import type { MindMapEditor } from "@quirekit/mind-map-simple";
import type { MindMapDialogOptions } from "../runtime/dialog/types";
import { rasterizeMindMap } from "../runtime/raster";
import { storeMindMapPreview } from "../runtime/upload";
import MindEditor from "./editor.vue";
import FeedbackDialog from "./feedback/dialog.vue";
import type { MindEditorHandle } from "./workspace/types";

const { t, failure } = useMindEditorMessages();
const props = defineProps<Omit<MindMapDialogOptions, "signal">>();
const emit = defineEmits<{ /** Releases the host target. */ close: [] }>();
const fallback = createTheme(), theme = computed(() => props.theme ?? fallback);
const editor = shallowRef<MindMapEditor>(), busy = ref(false), frozen = ref(false), error = ref("");
const workbench = ref<MindEditorHandle>(), recoveryPending = ref(false);
let alive = true;
const lifetime = new AbortController();
const reasons = { conflict: "saveConflict", readonly: "saveReadOnly", missing: "saveMissing" } as const;
/** Freezes one source-bound snapshot, then asks the host to accept it atomically. */
async function save(): Promise<void> {
  const current = editor.value; if (!current || busy.value || recoveryPending.value) return;
  if (current.getState().composing) { error.value = t("saveComposition"); return; }
  busy.value = true; error.value = "";
  try {
    const snapshot = await current.exportSvg();
    if (!alive) return;
    frozen.value = true; current.setReadOnly(true);
    const raster = await rasterizeMindMap(snapshot, props.ownerDocument, theme.value.color.surface.page);
    if (!alive) return;
    const next = await storeMindMapPreview(prepareMindMapSave(props.request.document, raster), props.uploadPreview, lifetime.signal);
    if (!alive) return;
    const result = props.request.commit(next);
    if (result === "saved") { await workbench.value?.finishRecovery(); if (alive) emit("close"); } else error.value = t(reasons[result]);
  } catch (reason) { if (alive) error.value = failure(reason); }
  finally { if (alive) { current.setReadOnly(false); frozen.value = false; busy.value = false; } }
}
/** Clears only this task's observed local draft after explicit user cancellation. */
async function cancel(): Promise<void> {
  if (busy.value) return;
  busy.value = true; await workbench.value?.finishRecovery(); if (alive) emit("close");
}
onBeforeUnmount(() => { alive = false; lifetime.abort(); });
/** @returns The retained draft's input owner after a save failure closes. */
function feedbackFocus(): HTMLElement | null {
  editor.value?.focus();
  return props.ownerDocument.activeElement as HTMLElement | null;
}
</script>
<template>
  <QuireThemeProvider :theme="theme"><QuireIconProvider :registry="quireIconRegistry">
    <QuireDialogRoot :open="true" :close-on-escape="false" :close-on-interact-outside="false" @update:open="open => { if (!open && !busy) void cancel(); }">
      <QuireDialogContent :title="t('editMap')" size="large" class="qk-mind-dialog" :show-close="!busy" :busy="busy">
        <div class="qk-mind-dialog__workspace"><MindEditor ref="workbench" :document="request.document.document" :title="request.document.title" :recovery="recovery" :theme="theme" :read-only="frozen" @ready="editor = $event" @recovery-pending="recoveryPending = $event" /></div>
        <FeedbackDialog :message="error" :title="t('saveFailed')" :final-focus-el="feedbackFocus" @close="error = ''" />
        <!-- Preserve native input focus until Save checks composition ownership. -->
        <template #footer><QuireButton variant="ghost" :disabled="busy" @click="cancel">{{ t('cancel') }}</QuireButton><QuireButton variant="solid" color="primary" :disabled="!editor || busy || recoveryPending" @pointerdown.prevent @click.stop="save">{{ busy ? t('saving') : t('saveMap') }}</QuireButton></template>
      </QuireDialogContent>
    </QuireDialogRoot>
  </QuireIconProvider></QuireThemeProvider>
</template>
