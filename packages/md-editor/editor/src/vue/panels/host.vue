<script setup lang="ts">
import { onBeforeUnmount, shallowRef, watch } from "vue";
import { EditorSelection } from "@quirekit/cm-state";
import type { MsfeEditor } from "@quirekit/msfe-core";
import type { MdEditorPanel, MdEditorPanelMount } from "../../panels/types";
import type { MdEditorLocale } from "../types";
const props = defineProps<{
  /** Panel to show. */ panel: MdEditorPanel;
  /** Mounted editor. */ editor: MsfeEditor;
  /** Control language. */ locale: MdEditorLocale;
  /** Whether the panel is shown; content stays mounted while hidden. */ open: boolean;
}>();
const emit = defineEmits<{
  /** The panel asked to close. */ close: [];
}>();
const frame = shallowRef<HTMLElement | null>(null);
let mounted: MdEditorPanelMount | undefined;
// Content mounts on first open and then lives with the editor, so a conversation keeps its place.
watch([() => props.open, frame], ([open, element]) => {
  if (!open || !element || mounted) return;
  mounted = props.panel.mount({
    editor: props.editor, locale: props.locale, ownerDocument: element.ownerDocument, close: () => emit("close"),
    reveal(range) {
      props.editor.setSelection(EditorSelection.single(range.from, range.to));
      props.editor.scrollTo(range.from);
    }
  });
  element.append(mounted.element);
}, { immediate: true, flush: "post" });
watch(() => props.locale, locale => mounted?.update({ locale }));
onBeforeUnmount(() => { mounted?.destroy(); mounted = undefined; });
</script>
<template>
  <section v-show="open" ref="frame" class="md-editor__panel" :aria-label="panel.label[locale]" :data-panel="panel.id" />
</template>
