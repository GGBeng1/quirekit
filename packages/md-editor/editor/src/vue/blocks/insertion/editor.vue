<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { QuireTaskPanel, QuireCalendar, QuireEmojiPicker } from "@quirekit/ui/vue";
import type { EditorState } from "@quirekit/cm-state";
import type { MdEditorLocale } from "../../types";
import type { MdMention, MdMentionSource } from "../../../commands/types";
import { mdMentionSource } from "../../../commands/portable";
import { mdEditorMessages } from "../../messages";
import { textDiagramTemplate } from "../../toolbar/blocks";
import DialogEditor from "../../dialogs/editor.vue";
import MentionPicker from "../../mentions/picker.vue";
import type { MdDialogIntent, MdDialogKind } from "../../dialogs/types";
import { useMdOverlayTarget } from "../../overlays/context";
import { createBlockInsertionWriter } from "./writer";
import { openBlockWorkspace } from "./workspace";
import type { MdBlockInsertionRequest } from "./types";
const props = defineProps<{
  /** Menu intent retained while editing parameters. */ request: MdBlockInsertionRequest;
  /** Accepted source state for conflict feedback. */ state: EditorState;
  /** Product language. */ locale: MdEditorLocale;
  /** Optional host contacts. */ mentions?: MdMentionSource | undefined;
}>();
const emit = defineEmits<{ /** Confirmed or dismissed. */ close: [] }>();
const writer = createBlockInsertionWriter(props.request), portal = useMdOverlayTarget(), error = ref("");
const { value, controls } = props.request, editor = controls.editor;
const text = mdEditorMessages[props.locale];
const dialog: MdDialogIntent | undefined = writer && ["inlineMath", "displayMath", "image", "link", "textDiagram"].includes(value) ? {
  kind: value as MdDialogKind, anchor: writer.anchor, insert: writer.commit, existing: false,
  body: value === "textDiagram" ? textDiagramTemplate(props.locale) : "x^2", url: "", label: "", title: "",
} : undefined;
let native: { close(): void } | null = null;
let closed = false;
onMounted(() => { if (!writer) close(); else native = openBlockWorkspace(value, editor, writer, close); });
onBeforeUnmount(() => { writer?.release(); native?.close(); });
/** Ends a draft without leaving a blank source block. */
function close(): void {
  if (closed) return;
  closed = true; emit("close");
  requestAnimationFrame(() => { if (!editor.scope.disposed) editor.focus(); });
}
/** @param source - Validated picker value. @returns Whether one adjacent insertion was accepted. */
function commit(source: string): boolean {
  if (writer?.commit(source)) { close(); return true; }
  error.value = text.conflict; return false;
}
/** @param item - Host contact. @returns Portable link insertion acceptance. */
function mention(item: MdMention): boolean { const source = mdMentionSource(item); return !!source && commit(source); }
/** @param value - Calendar ISO date. */
function date(value: string | readonly string[] | null): void { if (typeof value === "string") commit(value); }
</script>
<template>
  <DialogEditor v-if="dialog" :intent="dialog" :editor="editor" :state="state" :locale="locale" @close="close" />
  <QuireTaskPanel v-else-if="writer && ['date', 'emoji', 'mention'].includes(value)" :portal-target="portal ?? 'body'" :open="true" width="auto" :anchor-el="() => editor.element" :title="text[value as 'date']" @update:open="!$event && close()">
    <div @keydown.stop>
      <QuireCalendar v-if="value === 'date'" :label="text.date" density="compact" @update:model-value="date" />
      <QuireEmojiPicker v-else-if="value === 'emoji'" @select="commit($event.value)" />
      <MentionPicker v-else-if="mentions" :editor="editor" :anchor="writer.anchor" :source="mentions" :locale="locale" :insert="mention" />
    </div>
    <p v-if="error" role="alert" class="m-0 p-qk-surface text-qk-helper">{{ error }}</p>
  </QuireTaskPanel>
</template>
