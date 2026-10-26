<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { ref } from "vue";
import type { Editor } from "@quirekit/core";
import { QuireMenu } from "@quirekit/ui/vue";
import FileMenuTrigger from "./trigger.vue";
import { exportBlockBackup, importBlockBackup, importBlockText } from "../../ui/files/document";
import { readBlockListFeature } from "../../lists/feature";
import { readBlockTableFeature } from "../../table/feature";

const { t, localize } = useBlockLocale();

const props = defineProps<{ editor: Editor; title: string; editable: boolean }>();
const emit = defineEmits<{ title: [title: string]; feedback: [message: string] }>();
const input = ref<HTMLInputElement>();
const busy = ref(false);
/** @param value - Explicit import or export action. */
function execute(value: string): void {
  if (value === "import") { input.value?.click(); return; }
  const filename = (props.title || t("未命名文档")).replace(/[\\/:*?"<>|]/g, "_");
  const html = value === "html" ? readBlockListFeature(props.editor)?.exportHTML(props.editor) ?? props.editor.getHTML() : "";
  const content = value === "json" ? exportBlockBackup(props.editor, props.title) : value === "html"
    ? `<!doctype html><meta charset="utf-8"><title>${escapeHtml(props.title)}</title><style>body{max-width:900px;margin:40px auto;padding:20px;font:16px/1.7 system-ui}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:8px}pre{white-space:pre-wrap}</style><h1>${escapeHtml(props.title)}</h1>${readBlockTableFeature(props.editor)?.exportHTML?.(props.editor, html) ?? html}`
    : props.editor.getText();
  const mime = value === "json" ? "application/json" : value === "html" ? "text/html" : "text/plain";
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const link = document.createElement("a"); link.href = url; link.download = `${filename}.${value}`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  emit("feedback", value === "json" ? "已导出完整 JSON 备份" : value === "html" ? "已导出静态 HTML，交互对象请保留 JSON 备份" : "已导出纯文本，格式和图形不包含在内");
}
/** @param value - Plain host title. @returns Safe HTML text. */
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!); }
/** @param event - User-selected local file; async reading must not overwrite newer edits. */
async function importFile(event: Event): Promise<void> {
  const control = event.target as HTMLInputElement;
  const file = control.files?.[0]; control.value = "";
  if (!file || busy.value) return;
  busy.value = true; const original = props.editor.state.doc;
  try {
    if (file.size > 8 * 1024 * 1024) throw new Error("请选择小于 8 MB 的文档");
    const text = await file.text();
    if (props.editor.isDestroyed || !props.editor.isEditable || props.editor.state.doc !== original) throw new Error("读取期间文档已变化，请重新导入");
    if (/\.json$/i.test(file.name)) { const title = importBlockBackup(props.editor, text); if (title !== undefined) emit("title", title); }
    else if (/\.txt$/i.test(file.name)) { if (!importBlockText(props.editor, text)) throw new Error("无法导入文本"); }
    else throw new Error("请选择 JSON 备份或 TXT 文本");
    emit("feedback", "已导入，可撤销恢复原正文");
  } catch (error) { emit("feedback", error instanceof Error ? error.message : "导入失败，原文档已保留"); }
  finally { busy.value = false; }
}
</script>
<template>
  <QuireMenu :aria-label="t('导入导出')" :items="localize([
    { value: 'json', label: t('导出 JSON 完整备份'), icon: 'fileJson' }, { value: 'html', label: t('导出静态 HTML'), icon: 'fileCode' }, { value: 'txt', label: t('导出纯文本'), icon: 'fileText' },
    { value: 'import', label: t('导入 JSON / TXT（替换正文）'), icon: 'fileInput', disabled: !editable || busy }
  ])" @select="execute">
    <template #trigger><FileMenuTrigger :label="t('导入导出')" /></template>
  </QuireMenu>
  <input ref="input" hidden type="file" accept=".json,.txt" @change="importFile" />
</template>
