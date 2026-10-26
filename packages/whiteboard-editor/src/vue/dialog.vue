<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { createTheme, quireIconRegistry } from "@quirekit/ui";
import { QuireButton, QuireDialogContent, QuireDialogRoot, QuireIconProvider, QuireThemeProvider } from "@quirekit/ui/vue";
import { WhiteboardError, prepareWhiteboardSave } from "@quirekit/whiteboard";
import { useWhiteboardMessages } from "./messages";
import WhiteboardEditor from "./editor.vue";
import type { WhiteboardDialogProps, WhiteboardEditorHandle } from "./types";
import { storeWhiteboardPreview } from "../runtime/upload";

const props = defineProps<WhiteboardDialogProps>(), emit = defineEmits<{ /** Returns task ownership to the host. */ close: [] }>();
const { text, failure } = useWhiteboardMessages();
const fallback = createTheme(), theme = computed(() => props.theme ?? fallback);
const editor = ref<WhiteboardEditorHandle>(), ready = ref(false), busy = ref(false), error = ref<unknown>();
const dirty = ref(false), confirming = ref(false);
const draftPending = ref(false);
let alive = true;
const lifetime = new AbortController();

/** Keeps the live draft mounted until an explicit save or discard decision. */
function requestClose(): void {
  if (busy.value) return;
  if (dirty.value) confirming.value = true;
  else emit("close");
}
/** Returns to the unchanged drawing and its existing input history. */
function continueEditing(): void { confirming.value = false; editor.value?.focus(); }
/** @returns Explicit discard completion after cancelling pending checkpoints. */
async function discard(): Promise<void> {
  if (busy.value) return; busy.value = true;
  try {
    if (!await editor.value?.clearDraft()) { error.value = new WhiteboardError("draftClearFailed", "Draft cleanup failed"); return; }
    if (alive) emit("close");
  } finally { if (alive) busy.value = false; }
}
/** Prepares matching source and preview before the host's final synchronous acceptance check. */
async function save(): Promise<void> {
  if (!editor.value || busy.value) return;
  busy.value = true; error.value = "";
  try {
    const snapshot = await editor.value.snapshot();
    if (!alive) return;
    const document = await storeWhiteboardPreview(prepareWhiteboardSave(props.request.document, snapshot.scene, snapshot.preview), props.uploadPreview, lifetime.signal);
    if (!alive) return;
    const result = props.request.commit(document);
    if (result === "saved") { await editor.value.clearDraft(); if (alive) emit("close"); } else error.value = new WhiteboardError(result, result);
  } catch (reason) { if (alive) error.value = reason; }
  finally { if (alive) busy.value = false; }
}
onBeforeUnmount(() => { alive = false; lifetime.abort(); });
</script>
<template>
  <QuireThemeProvider :theme="theme"><QuireIconProvider :registry="quireIconRegistry">
    <QuireDialogRoot :open="true" :close-on-escape="false" :close-on-interact-outside="false" @update:open="open => { if (!open) requestClose(); }">
      <QuireDialogContent :title="text.editBoard" size="large" class="qk-whiteboard-dialog" :show-close="!busy" :busy="busy" :error-text="error ? failure(error) : ''">
        <div class="qk-whiteboard-dialog__workspace"><WhiteboardEditor ref="editor" :document="request.document" :drafts="drafts" :theme="theme" :read-only="busy || confirming" embedded @ready="ready = true" @change="dirty = true" @draft-pending="draftPending = $event" /></div>
        <template #footer>
          <div v-if="confirming" class="qk-whiteboard-dialog__confirm" role="alert">
            <span>{{ text.closeWarning }}</span>
            <div class="qk-whiteboard-dialog__choices">
              <QuireButton variant="ghost" :disabled="busy" @click="continueEditing">{{ text.continue }}</QuireButton>
              <QuireButton variant="outline" :disabled="busy" @click="discard">{{ text.discard }}</QuireButton>
              <QuireButton variant="solid" color="primary" :disabled="!ready || busy || draftPending" @click="save">{{ busy ? text.saving : text.saveClose }}</QuireButton>
            </div>
          </div>
          <template v-else><QuireButton variant="ghost" :disabled="busy" @click="requestClose">{{ text.cancel }}</QuireButton><QuireButton variant="solid" color="primary" :disabled="!ready || busy || draftPending" @click="save">{{ busy ? text.saving : text.save }}</QuireButton></template>
        </template>
      </QuireDialogContent>
    </QuireDialogRoot>
  </QuireIconProvider></QuireThemeProvider>
</template>
