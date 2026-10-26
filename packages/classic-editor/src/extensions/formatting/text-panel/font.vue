<script setup lang="ts">
import { computed } from "vue";
import { EditorUIFontInput } from "@quirekit/editor-ui/vue";
import type { ClassicEditorRenderContext, ClassicEditorToolbarContributionState } from "@classic/types";
import { useClassicFontLibrary } from "@classic/extensions/typography/toolbar/font-family/use-font-library";
import { textPanelMessage } from "./copy";
const props = defineProps<{
  /** Reactive editor context. */
  context: ClassicEditorRenderContext;
  /** Independent script slot. */
  target: "eastAsia" | "latin";
}>();
const state = { get context() { return props.context; } } as ClassicEditorToolbarContributionState;
const controller = useClassicFontLibrary(state);
controller.selectFontTarget(props.target);
const { pickerOpen, currentFamilyOptionKey, currentFamilyLabel, fontPickerOptions, selectFontOption, busyFamily } = controller;
const label = computed(() => textPanelMessage(props.context.locale, props.target));
</script>
<template>
 <EditorUIFontInput v-model:open="pickerOpen" :label="label" :disabled="!context.editor.isEditable || busyFamily !== ''" :value="currentFamilyOptionKey" :placeholder="currentFamilyLabel" :options="fontPickerOptions" @select="selectFontOption" />
</template>
