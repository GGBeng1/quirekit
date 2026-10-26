<script setup lang="ts">
import { onBeforeUnmount, shallowRef } from "vue";
import type { Editor } from "@quirekit/core";
import { registerBlockCodeRenderer } from "../../code/registry";
import { createBlockCodeSurface } from "../../code/surface";
import type { BlockCodeEntry } from "./types";
import BlockCodeHeader from "./header.vue";
const props = defineProps<{ editor: Editor }>();
const entries = shallowRef<readonly BlockCodeEntry[]>([]);
let sequence = 0, editable = props.editor.isEditable;
const release = registerBlockCodeRenderer(props.editor, context => {
  const surface = createBlockCodeSurface(context, () => { entry.state.value = surface.snapshot(); },
    () => { entries.value = entries.value.filter(item => item !== entry); });
  const entry: BlockCodeEntry = { key: ++sequence, surface, state: shallowRef(surface.snapshot()) };
  entries.value = [...entries.value, entry]; return surface;
});
/** Visits mounted headers only when permission flips, never on text/selection updates. */
function permission(): void {
  if (editable === props.editor.isEditable) return;
  editable = props.editor.isEditable;
  for (const entry of entries.value) entry.surface.syncEditable();
}
props.editor.on("update", permission);
onBeforeUnmount(() => { release(); props.editor.off("update", permission); for (const entry of entries.value) entry.surface.destroy(); });
</script>
<template>
  <Teleport v-for="entry in entries" :key="entry.key" :to="entry.surface.header">
    <BlockCodeHeader :surface="entry.surface" :state="entry.state.value" />
  </Teleport>
</template>
