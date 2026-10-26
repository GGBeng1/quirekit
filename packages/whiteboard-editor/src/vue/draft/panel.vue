<script setup lang="ts">
import { QuireButton } from "@quirekit/ui/vue";
import { useWhiteboardMessages } from "../messages";
const { locale, text, failure } = useWhiteboardMessages();
import type { DraftPanelProps } from "./types";
defineProps<DraftPanelProps>();
defineEmits<{ /** Restores an unchanged-baseline checkpoint. */ restore: []; /** Discards only the inspected checkpoint. */ discard: []; /** Exports without replacing canonical content. */ download: [] }>();
</script>
<template>
  <div v-if="state?.candidate" class="qk-whiteboard-recovery" role="region" :aria-label="text.recovery">
    <div class="qk-whiteboard-recovery__copy">
      <strong>{{ state.status === 'conflict' ? text.recoveryConflict : text.recoveryFound }}</strong>
      <span>{{ state.status === 'conflict' ? text.recoveryConflictHint : text.recoveryHint }}</span>
      <time :datetime="new Date(state.candidate.updatedAt).toISOString()">{{ new Date(state.candidate.updatedAt).toLocaleString(locale) }}</time>
      <span v-if="error || state.error" role="alert">{{ failure(error || state.error, "storageUnavailable") }}</span>
    </div>
    <div class="qk-whiteboard-recovery__actions">
      <QuireButton variant="ghost" :disabled="disabled" @click="$emit('discard')">{{ text.discardDraft }}</QuireButton>
      <QuireButton variant="outline" :disabled="disabled" @click="$emit('download')">{{ text.exportDraft }}</QuireButton>
      <QuireButton v-if="state.status === 'recovery'" variant="solid" color="primary" :disabled="disabled" @click="$emit('restore')">{{ text.restoreDraft }}</QuireButton>
    </div>
  </div>
</template>
<style>
.qk-whiteboard-recovery { display:flex; align-items:center; justify-content:space-between; gap:var(--qk-space-surface); padding:var(--qk-space-surface-compact) var(--qk-space-surface); flex-wrap:wrap; border-bottom:1px solid var(--qk-color-border-subtle); background:var(--qk-color-surface-raised); }
.qk-whiteboard-recovery__copy { display:flex; flex-direction:column; gap:4px; flex:1 1 240px; min-width:0; font-size:12px; color:var(--qk-color-text-secondary); }
.qk-whiteboard-recovery__copy strong { font-size:14px; color:var(--qk-color-text-primary); }
.qk-whiteboard-recovery__copy time { color:var(--qk-color-text-tertiary); }
.qk-whiteboard-recovery__actions { display:flex; gap:var(--qk-space-inline); flex-wrap:wrap; margin-inline-start:auto; }
</style>
