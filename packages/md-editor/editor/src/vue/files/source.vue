<script setup lang="ts">
import { computed, ref } from "vue";
import { QuireFileUpload, QuireFileUploadList, QuireFileIcon, QuireIcon, QuireIconButton,
  QuireCodeBlock, QuireField, QuireTextarea, QuireButton } from "@quirekit/ui/vue";
import type { QuireKitFileUploadChangeDetails } from "@quirekit/ui";
import type { MdEditorLocale } from "../types";
import { mdEditorMessages } from "../messages";

const props = defineProps<{
  /** Word conversion versus plain Markdown reading. */ word: boolean;
  /** Localized actions and feedback. */ locale: MdEditorLocale;
  /** Draft editing is blocked until the file is ready. */ disabled: boolean;
}>();
const body = defineModel<string>({ required: true });
const emit = defineEmits<{
  /** Selection and removal remain draft-only actions. */ choose: [file?: File];
}>();
const text = computed(() => mdEditorMessages[props.locale]);
const files = ref<File[]>([]), editing = ref(false);
const label = computed(() => props.word ? text.value.wordChooseFile : text.value.chooseFile);
const hint = computed(() => props.word ? text.value.wordFileLimit : text.value.fileTooLarge);
/** @param details - Public file collection after selection or removal. */
function change(details: QuireKitFileUploadChangeDetails): void {
  const previous = files.value[0];
  files.value = details.acceptedFiles;
  if (files.value[0] !== previous) { editing.value = false; emit("choose", files.value[0]); }
}
</script>
<template>
  <QuireFileUpload :model-value="files" :label="label" :allow-drop="false"
    :accept="word ? '.docx' : '.md,.markdown,.txt'" :max-file-size="word ? 20_000_000 : 2_000_000"
    @file-change="change">
    <template #default="upload">
      <div class="flex flex-wrap items-center gap-qk-inline">
        <QuireButton :disabled="upload.disabled" @click="upload.openFilePicker">
          <template #leading><QuireIcon name="upload" /></template>{{ label }}
        </QuireButton>
        <span class="text-qk-helper text-qk-text-muted">{{ hint }}</span>
      </div>
      <QuireFileUploadList v-if="upload.acceptedFiles.length || upload.rejectedFiles.length" layout="compact">
        <template #item="{ file, sizeText, remove }">
          <QuireFileIcon :name="file.name" :media-type="file.type" :size="28" />
          <div class="min-w-0 flex-1"><p class="truncate" :title="file.name">{{ file.name }}</p><p class="text-qk-helper text-qk-text-muted">{{ sizeText }}</p></div>
          <QuireIconButton :label="`${text.removeFile} ${file.name}`" size="xs" variant="ghost" @click="remove"><QuireIcon name="close" /></QuireIconButton>
        </template>
        <template #rejection="{ rejection, remove }">
          <QuireIcon name="triangleAlert" />
          <p class="min-w-0 flex-1">{{ rejection.file.name }} — {{ hint }}</p>
          <QuireIconButton :label="`${text.removeFile} ${rejection.file.name}`" size="xs" variant="ghost" @click="remove"><QuireIcon name="close" /></QuireIconButton>
        </template>
      </QuireFileUploadList>
    </template>
  </QuireFileUpload>
  <QuireCodeBlock v-if="!editing" :code="body" language="markdown" filename="document.md" :aria-label="text.markdownSource"
    :max-height="240" wrap>
    <template #actions><QuireButton size="sm" variant="text" :disabled="disabled" @click="editing = true">{{ text.editPreview }}</QuireButton></template>
  </QuireCodeBlock>
  <template v-else>
    <QuireField :label="text.markdownSource" width="100%">
      <template #default="{ controlProps }"><QuireTextarea v-bind="controlProps" v-model="body" :rows="8" width="100%" :disabled="disabled" /></template>
    </QuireField>
    <QuireButton size="sm" variant="text" @click="editing = false">{{ text.preview }}</QuireButton>
  </template>
</template>
