<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import { QuireMenu } from "@quirekit/ui/vue";
import type { MsfeEditor } from "@quirekit/msfe-core";
import type { MdMentionSource } from "../../commands/types";
import type { MdEditorLocale } from "../types";
import type { MdMentionSession } from "./types";
import { mdEditorMessages } from "../messages";
import MentionPicker from "./picker.vue";
import { useMdOverlayTarget } from "../overlays/context";
const portal = useMdOverlayTarget();
const props = defineProps<{
  /** Mounted source owner. */ editor: MsfeEditor;
  /** Original source anchor and measured opening location. */ session: MdMentionSession;
  /** Host-provided contacts. */ source: MdMentionSource;
  /** Control locale. */ locale: MdEditorLocale;
  /** `document` links a host document instead of mentioning a contact. */ kind?: "mention" | "document" | undefined;
}>();
const emit = defineEmits<{ /** Surface closed, preserving any uncommitted @ source. */ close: [] }>();
onBeforeUnmount(() => props.session.anchor.release());
/** Closes the public overlay and returns to native Markdown input. */
function close(): void { emit("close"); requestAnimationFrame(() => props.editor.focus()); }
</script>
<template>
  <QuireMenu :portal-target="portal ?? 'body'" :open="true" :anchor-point="session.point" width="auto" :aria-label="kind === 'document' ? mdEditorMessages[locale].documentLink : mdEditorMessages[locale].mention"
    :typeahead="false" @update:open="!$event && close()">
    <MentionPicker :editor="editor" :anchor="session.anchor" :source="source" :locale="locale" :kind="kind" @inserted="close" />
  </QuireMenu>
</template>
