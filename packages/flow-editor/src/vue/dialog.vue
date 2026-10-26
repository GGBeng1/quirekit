<script setup lang="ts">
import { flowEditorText, flowEditorFailure, resolveFlowLocale } from "../locale/resolve";
import { computed, onBeforeUnmount, ref, shallowRef } from "vue";
import { createTheme, quireIconRegistry } from "@quirekit/ui";
import { QuireLocaleProvider, QuireButton, QuireDialogContent, QuireDialogRoot, QuireIconProvider, QuireThemeProvider } from "@quirekit/ui/vue";
import { prepareFlowchartSave } from "@quirekit/flowchart";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
import type { FlowchartDialogOptions } from "../types";
import { rasterizeFlowchart } from "../runtime/raster";
import { storeFlowchartPreview } from "../runtime/upload";
import FlowEditor from "./editor.vue";

const props = defineProps<Omit<FlowchartDialogOptions, "signal">>();
const emit = defineEmits<{ /** Releases the host target. */ close: [] }>();
const locale = computed(() => resolveFlowLocale(props.locale));
/** @param source - Feature message identity. @returns Current dialog label. */
const t = (source: string) => flowEditorText(locale.value, source);
/** @param reason - Unmodified operation failure. @returns Localized display message. */
const failure = (reason: unknown) => flowEditorFailure(locale.value, reason);
const fallback = createTheme(), theme = computed(() => props.theme ?? fallback);
const editor = shallowRef<FlowchartEditor>(), busy = ref(false), error = ref("");
let alive = true;
const lifetime = new AbortController();
const reasons = { conflict: "正文中的图形已被修改，当前草稿仍保留。请导出草稿后重新打开。", readonly: "文档已变为只读，当前草稿未提交。", missing: "原图形或文档已被移除，当前草稿未提交。" };
/** Freezes one source-bound snapshot, then asks the host to accept it atomically. */
async function save(): Promise<void> {
  const current = editor.value; if (!current || busy.value) return;
  if (current.getState().composing) { error.value = "请完成文字输入后再保存"; return; }
  busy.value = true; error.value = "";
  try {
    const snapshot = await current.exportSvg();
    if (!alive) return;
    current.setReadOnly(true);
    const raster = await rasterizeFlowchart(snapshot, props.ownerDocument, theme.value.color.surface.page);
    if (!alive) return;
    const next = await storeFlowchartPreview(prepareFlowchartSave(props.request.document, raster), props.uploadPreview, lifetime.signal);
    if (!alive) return;
    const result = props.request.commit(next);
    if (result === "saved") emit("close"); else error.value = reasons[result];
  } catch (reason) { if (alive) error.value = reason instanceof Error ? reason.message : String(reason); }
  finally { if (alive) { current.setReadOnly(false); busy.value = false; } }
}
onBeforeUnmount(() => { alive = false; lifetime.abort(); });
</script>
<template>
  <QuireLocaleProvider :locale="locale"><QuireThemeProvider :theme="theme"><QuireIconProvider :registry="quireIconRegistry">
    <QuireDialogRoot :open="true" :close-on-escape="false" :close-on-interact-outside="false" @update:open="open => { if (!open && !busy) emit('close'); }">
      <QuireDialogContent :title="t('编辑流程图')" size="large" class="qk-flow-dialog" :show-close="!busy" :busy="busy" :error-text="failure(error)">
        <div class="qk-flow-dialog__workspace"><FlowEditor :document="request.document.document" :title="request.document.title" :theme="theme" :library-store="libraryStore" :read-only="busy" @ready="editor = $event" /></div>
        <template #footer><QuireButton variant="ghost" :disabled="busy" @click="emit('close')">{{ t('取消') }}</QuireButton><QuireButton variant="solid" color="primary" :disabled="!editor || busy" @click="save">{{ busy ? t('正在保存…') : t('保存图形') }}</QuireButton></template>
      </QuireDialogContent>
    </QuireDialogRoot>
  </QuireIconProvider></QuireThemeProvider></QuireLocaleProvider>
</template>
