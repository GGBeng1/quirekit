<script setup lang="ts">
import { computed, ref } from "vue";
import { createTheme, quireIconRegistry } from "@quirekit/ui";
import { QuireDialogContent, QuireDialogRoot, QuireThemeProvider, QuireLocaleProvider, QuireIconProvider } from "@quirekit/ui/vue";
import type { TextDiagramDialogOptions } from "../types";
import { textDiagramMessages } from "../locale/messages";
import TextDiagramEditor from "./editor.vue";
const props = defineProps<Omit<TextDiagramDialogOptions, "signal">>();
const emit = defineEmits<{ /** Releases the mapped target. */ close: [] }>();
const locale = computed(() => /^en(?:-|$)/iu.test(props.locale ?? "") ? "en" : "zh-CN");
const theme = computed(() => props.theme ?? createTheme());
const workspace = ref<InstanceType<typeof TextDiagramEditor>>();
</script>
<template>
  <QuireLocaleProvider :locale="locale"><QuireThemeProvider :theme="theme"><QuireIconProvider :registry="quireIconRegistry">
    <QuireDialogRoot :open="true" :close-on-interact-outside="false" @escape-key-down="workspace?.handleEscape($event)" @update:open="!$event && emit('close')">
      <QuireDialogContent :title="textDiagramMessages(locale).title" size="large" data-qk-not-prose>
        <TextDiagramEditor ref="workspace" :request="request" :owner-document="ownerDocument" :locale="locale" @saved="emit('close')" @cancel="emit('close')" />
      </QuireDialogContent>
    </QuireDialogRoot>
  </QuireIconProvider></QuireThemeProvider></QuireLocaleProvider>
</template>
