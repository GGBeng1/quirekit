<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { onBeforeUnmount, shallowRef } from "vue";
import type { QuireEditor } from "@quirekit/core";
import { DataViewInline } from "@quirekit/data-view-editor/vue";
import { registerBlockDataViewRenderer } from "../../data-view/inline/registry";
import { createBlockDataViewSurface } from "../../data-view/inline/view";
import type { BlockDataViewEntry } from "./types";

const { t } = useBlockLocale();

const props = defineProps<{ /** Document owner mounted by the parent product shell. */ editor: QuireEditor }>();
const entries = shallowRef<readonly BlockDataViewEntry[]>([]);
let sequence = 0, editable = props.editor.isEditable;
const release = registerBlockDataViewRenderer(props.editor, context => {
  const key = ++sequence;
  const surface = createBlockDataViewSurface(context,
    () => { entry.state.value = surface.snapshot(); },
    () => { entries.value = entries.value.filter(item => item !== entry); });
  const entry: BlockDataViewEntry = { key, surface, state: shallowRef(surface.snapshot()) };
  entries.value = [...entries.value, entry];
  return surface;
});
/** Compares permission once per update; only an actual permission flip visits mounted widgets. */
function syncEditable(): void {
  if (editable === props.editor.isEditable) return;
  editable = props.editor.isEditable;
  for (const entry of entries.value) entry.surface.syncEditable();
}
props.editor.on("update", syncEditable);
onBeforeUnmount(() => {
  release(); props.editor.off("update", syncEditable);
  for (const entry of entries.value) entry.surface.destroy();
});
</script>

<template>
  <Teleport v-for="entry in entries" :key="entry.key" :to="entry.surface.dom">
    <DataViewInline v-if="entry.state.value.value" :value="entry.state.value.value" :read-only="entry.state.value.readOnly"
      :commit="entry.state.value.commit" :undo="entry.state.value.undo" :redo="entry.state.value.redo" />
    <p v-else role="status">{{ t("多维表格格式暂不支持，原始数据已保留。") }}</p>
  </Teleport>
</template>
