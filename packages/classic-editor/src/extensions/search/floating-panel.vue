<script setup lang="ts">
import { computed } from "vue";
import { EditorUIFloatingPanel } from "@quirekit/editor-ui/vue";
import { resolveClassicEditorText } from "@classic/localization";
import { classicSearchText } from "./localization";
import { resetClassicSearchReveal } from "./activation";
import ClassicSearchPanel from "./panel.vue";
import type { ClassicSearchSession } from "./session";
import type { ClassicSearchHostState } from "./types";

const props = defineProps<{
  /** Live product context. */ readonly host: ClassicSearchHostState;
  /** Root-local search session. */ readonly session: ClassicSearchSession;
}>();
const title = computed(() => resolveClassicEditorText(classicSearchText.title, props.host.context.locale));
const closeLabel = computed(() => resolveClassicEditorText(classicSearchText.close, props.host.context.locale));
const viewport = computed(() => props.session.state.open
  ? props.host.context.root.querySelector<HTMLElement>(".qk-classic-editor__workspace-viewport") : null);

/** Re-arms activation when focus returns from outside the card. @param event - Focus entering the search card. */
function resetOnReturn(event: FocusEvent): void {
  const from = event.relatedTarget;
  if (!(from instanceof Node) || !(event.currentTarget as HTMLElement).contains(from)) resetClassicSearchReveal(props.host.context.editor);
}
</script>

<template>
  <EditorUIFloatingPanel :open="session.state.open" :root="host.context.root" :viewport="viewport"
    :title="title" :close-label="closeLabel" class="qk-classic-search-card" @close="session.close()" @focusin="resetOnReturn">
    <ClassicSearchPanel :editor="host.context.editor" :session="session" :locale="host.context.locale" />
  </EditorUIFloatingPanel>
</template>
