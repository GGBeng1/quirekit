<script setup lang="ts">
import { ref } from "vue";
import { createTheme, quireIconRegistry } from "@quirekit/ui";
import { QuireDialogRoot, QuireDialogContent, QuireThemeProvider, QuireIconProvider } from "@quirekit/ui/vue";
import type { DataViewSave } from "@quirekit/data-view";
import type { DataViewDialogOptions } from "../types";
import Workspace from "./workspace.vue";
const props = defineProps<DataViewDialogOptions>();
const emit = defineEmits<{close: []}>();
const busy = ref(false), error = ref("");
/** The host must acknowledge the exact target before the task can close.
 * @param save - Complete conditional save.
 */
async function commit(save: DataViewSave): Promise<void> {
  if (busy.value || props.readOnly) return;
  busy.value = true; error.value = "";
  try { const result = await props.request.commit(save); if (result.accepted) emit("close"); else error.value = result.message ?? "文档已发生变化，请关闭后重新打开。"; }
  catch (failure) { error.value = failure instanceof Error ? failure.message : String(failure); }
  finally { busy.value = false; }
}
</script>
<template>
  <QuireThemeProvider :theme="theme ?? createTheme()"><QuireIconProvider :registry="quireIconRegistry"><QuireDialogRoot :open="true" :close-on-escape="!busy" :close-on-interact-outside="false" @update:open="!$event && !busy && emit('close')">
    <QuireDialogContent title="多维表格" size="large" :portal-target="ownerDocument.body" :show-close="!busy" :error-text="error" class="data-view-dialog">
      <Workspace :value="request.value" :read-only="readOnly" :provider="provider" :busy="busy" @apply="commit" @cancel="emit('close')" />
    </QuireDialogContent>
  </QuireDialogRoot></QuireIconProvider></QuireThemeProvider>
</template>
