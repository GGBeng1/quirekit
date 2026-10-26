<script setup lang="ts">
import { computed, ref } from "vue";
import { createTheme, quireIconRegistry } from "@quirekit/ui";
import { QuireButton, QuireDialogContent, QuireDialogRoot, QuireField, QuireInput, QuireIconProvider, QuireThemeProvider } from "@quirekit/ui/vue";
import { WhiteboardError, readWhiteboardDocument } from "@quirekit/whiteboard";
import { useWhiteboardMessages } from "./messages";
import type { WhiteboardDialogProps } from "./types";

const props = defineProps<WhiteboardDialogProps>(), emit = defineEmits<{ /** Returns target ownership. */ close: [] }>();
const { text, failure } = useWhiteboardMessages();
const title = ref(props.request.document.title), error = ref<unknown>();
const theme = computed(() => props.theme ?? createTheme());
/** Commits a title revision with the original scene and preview, using the host's exact target. */
function save(): void {
  const name = title.value.trim();
  if (!name || name.length > 200) { error.value = new WhiteboardError("nameInvalid", "Invalid name"); return; }
  if (name === props.request.document.title) { emit("close"); return; }
  try {
    const next = readWhiteboardDocument({ ...props.request.document, title: name, revision: props.request.document.revision + 1 });
    const result = props.request.commit(next);
    if (result === "saved") emit("close");
    else error.value = new WhiteboardError(result === "readonly" ? "nameReadonly" : "nameConflict", result);
  } catch (reason) { error.value = reason; }
}
</script>
<template>
  <QuireThemeProvider :theme="theme"><QuireIconProvider :registry="quireIconRegistry">
    <QuireDialogRoot :open="true" :close-on-interact-outside="false" @update:open="value => { if (!value) emit('close'); }">
      <QuireDialogContent :title="text.renameBoard" size="small" class="qk-whiteboard-rename" :error-text="error ? failure(error) : ''">
        <form @submit.prevent="save"><QuireField :label="text.name"><QuireInput v-model="title" :aria-label="text.name" :maxlength="200" autofocus /></QuireField></form>
        <template #footer><QuireButton variant="ghost" @click="emit('close')">{{ text.cancel }}</QuireButton><QuireButton variant="solid" color="primary" @click="save">{{ text.saveName }}</QuireButton></template>
      </QuireDialogContent>
    </QuireDialogRoot>
  </QuireIconProvider></QuireThemeProvider>
</template>
