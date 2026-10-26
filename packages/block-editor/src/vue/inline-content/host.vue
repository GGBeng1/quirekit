<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import type { Editor } from "@quirekit/core";
import { QuireDialogRoot, QuireDialogContent, QuireButton, QuireDatePicker, QuireEmojiPicker } from "@quirekit/ui/vue";
import { validInlineDate } from "../../inline-content/value";
import { openSelectedInlineDate, registerInlineContentHost } from "../../inline-content/tasks";
import type { InlineContentRequest } from "../../inline-content/types";
import { restoreBlockEditorFocus } from "../../ui/focus";
import DatePopup from "./date-popup.vue";

const { t } = useBlockLocale();
const props = defineProps<{ /** Canonical owner. */ editor: Editor }>();
const request = shallowRef<InlineContentRequest | null>(null), date = ref<string | null>(null), error = ref("");
/** @param focus - Explicit completion restores input; outside interaction keeps its new owner. */
function close(focus = true): void { request.value = null; error.value = ""; if (focus) restoreBlockEditorFocus(props.editor); }
const release = registerInlineContentHost(props.editor, source => { request.value = source; date.value = validInlineDate(source.value) ? source.value : null; error.value = source.kind === "date" && source.value && !date.value ? t("原日期“{date}”无效，请重新选择", { date: source.value }) : ""; });
/** @param value - Complete chosen value. */
function save(value: string): void {
  if (!request.value || !props.editor.commands.applyBlockInlineContent(request.value, value)) { error.value = "内容无效或文档已变化，请关闭后重新打开"; return; }
  props.editor.commands.closeHistory(); close();
}
let root: HTMLElement | undefined;
/** @param event - Date activation is a UI action, before View's structural text-mutation guard. */
function activate(event: KeyboardEvent): void {
  if (request.value || event.defaultPrevented || event.isComposing || event.keyCode === 229
    || event.key !== "Enter" || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey
    || !props.editor.mountedView?.hasFocus()) return;
  if (openSelectedInlineDate(props.editor)) { event.preventDefault(); event.stopPropagation(); }
}
/** Releases the previous mounted input boundary. */
function unbind(): void { root?.removeEventListener("keydown", activate, true); root = undefined; }
/** Binds only to the current editor root; each key checks the selected atom in constant time. */
function bind(): void { unbind(); root = props.editor.mountedView?.dom; root?.addEventListener("keydown", activate, true); }
onMounted(bind);
props.editor.on("mount", bind); props.editor.on("unmount", unbind);
onBeforeUnmount(() => { release(); unbind(); props.editor.off("mount", bind); props.editor.off("unmount", unbind); });
</script>
<template>
  <DatePopup v-if="request?.kind === 'date' && request.position !== undefined" :editor="editor" :request="request" :error="t(error)" @select="save" @close="close" />
  <QuireDialogRoot v-else-if="request" open :restore-focus="false" @update:open="!$event && close()">
    <QuireDialogContent :title="request.kind === 'date' ? t('正文日期') : t('插入表情')" size="small" :error-text="t(error)">
      <QuireDatePicker v-if="request.kind === 'date'" v-model="date" :label="t('日期')" :description="t('选择或输入年、月、日')" width="100%" :open-on-focus="false" />
      <QuireEmojiPicker v-else autofocus @select="save($event.value)" />
      <template #footer>
        <QuireButton variant="text" @click="close">{{ t("取消") }}</QuireButton>
        <QuireButton v-if="request.kind === 'date'" :disabled="!date" @click="date && save(date)">{{ t("确认") }}</QuireButton>
      </template>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>
