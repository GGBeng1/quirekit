<script setup lang="ts">
import { ref } from "vue";
import { QuireButton, QuireDialogContent, QuireDialogRoot } from "@quirekit/ui/vue";
import type { MindMapRecoveryState } from "../../recovery/types";
import { useMindEditorMessages } from "../messages";
const props = defineProps<{ /** Candidate and baseline admission. */ state: MindMapRecoveryState; /** Explicit restore port. */ restore: () => Promise<void>; /** Explicit discard port. */ discard: () => Promise<boolean>; /** Input owner after a decision. */ finalFocusEl: () => HTMLElement | null }>();
const emit = defineEmits<{ /** Public failure popup. */ error: [reason: unknown] }>();
const { t, locale } = useMindEditorMessages(), busy = ref(false);
/** @param restore - Whether to restore rather than discard. @returns Decision completion, preserving failed candidates. */
async function decide(restore: boolean): Promise<void> {
  if (busy.value) return; busy.value = true;
  try { if (restore) await props.restore(); else await props.discard(); }
  catch (error) { emit("error", error); } finally { busy.value = false; }
}
/** Downloads a complete source-and-fields backup without applying a stale record. */
function download(): void {
  if (!props.state.candidate) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(props.state.candidate, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = "mind-map.mind-draft.json";
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
}
</script>
<template>
  <QuireDialogRoot :open="state.status === 'recovery' || state.status === 'conflict'" :close-on-escape="false" :close-on-interact-outside="false" :final-focus-el="finalFocusEl">
    <QuireDialogContent :title="t(state.status === 'conflict' ? 'draftConflictTitle' : 'draftRecoveryTitle')" size="small" :show-close="false" :busy="busy">
      <p>{{ t(state.status === 'conflict' ? 'draftConflictHelp' : 'draftRecoveryHelp') }}</p>
      <p v-if="state.candidate">{{ t('draftSavedAt', { time: new Date(state.candidate.updatedAt).toLocaleString(locale) }) }}</p>
      <template #footer>
        <QuireButton size="sm" variant="ghost" :disabled="busy" @click="download">{{ t('draftDownload') }}</QuireButton>
        <QuireButton size="sm" :disabled="busy" @click="decide(false)">{{ t('draftDiscard') }}</QuireButton>
        <QuireButton v-if="state.status === 'recovery'" size="sm" variant="solid" color="primary" :disabled="busy" @click="decide(true)">{{ t('draftRestore') }}</QuireButton>
      </template>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>
