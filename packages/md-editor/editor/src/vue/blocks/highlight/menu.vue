<script setup lang="ts">
import { computed } from "vue";
import { QuireIcon, QuireMenuSubmenu } from "@quirekit/ui/vue";
import type { SourceBlockControls } from "@quirekit/msfe-core";
import { readHighlightHeader } from "../../../highlight/attributes";
import type { MdEditorLocale } from "../../types";
import { blockLabels } from "../labels";
import Palettes from "./palettes.vue";
const props = defineProps<{
  /** Exact captured block; only a highlight container shows color settings. */ controls: SourceBlockControls;
  /** Product language. */ locale: MdEditorLocale;
  /** Render the palettes directly, for the mobile bottom panel. */ inline?: boolean;
}>();
const emit = defineEmits<{ /** Successful color change. */ close: [] }>();
const current = computed(() => {
  const { editor, block } = props.controls;
  return block.name === "CustomContainer" ? readHighlightHeader(editor.state.sliceDoc(block.from, editor.state.doc.lineAt(block.from).to)) : null;
});
</script>
<template>
  <template v-if="current">
    <Palettes v-if="inline" :controls="controls" :current="current" :locale="locale" @close="emit('close')" />
    <QuireMenuSubmenu v-else width="auto" :content-props="{ 'aria-label': blockLabels(locale).colors }">
      <template #leading><QuireIcon name="fillColor" /></template>
      <template #trigger>{{ blockLabels(locale).colors }}</template>
      <Palettes :controls="controls" :current="current" :locale="locale" @close="emit('close')" />
    </QuireMenuSubmenu>
  </template>
</template>
