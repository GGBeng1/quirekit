<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from "vue";
import { createTheme } from "@quirekit/ui";
import { QuireButton, QuireDialogContent, QuireField, QuireIcon, QuireIconButton, QuireInputNumber, QuireSegmented } from "@quirekit/ui/vue";
import { defaultFlowchartPageSettings, readFlowchartPageSettings, type FlowchartPageSettings } from "@quirekit/flowchart";
import { useFlowMessages } from "../messages";
import { useFlowExportPreview } from "../export/preview";
import type { FlowPageRequest } from "./types";
import { useFlowPagePreview } from "./preview";
import { createFlowPrintDocument } from "../../print/document";
import { printFlowDocument } from "../../print/frame";
import { downloadFlowBlob } from "../../ui/download";
import "./styles.css";

const props = defineProps<{ /** Frozen complete drawing. */ request: FlowPageRequest; /** Live host permission. */ readOnly: boolean; /** Guarded explicit persistence. */ apply: (page: FlowchartPageSettings) => void }>();
const emit = defineEmits<{ /** Closes and cancels preparation. */ close: [] }>(), { t, locale, failure } = useFlowMessages();
const opening = props.request.document.page ?? defaultFlowchartPageSettings;
const paper = ref<string>(opening.paper), orientation = ref<string>(opening.orientation), scaleMode = ref(opening.scale === "fit" ? "fit" : "fixed"), scale = ref(String(opening.scale === "fit" ? 100 : opening.scale * 100));
const margins = reactive({ top: String(opening.margins.top), right: String(opening.margins.right), bottom: String(opening.margins.bottom), left: String(opening.margins.left) });
const insets = [{ key: "top", label: "上边距" }, { key: "right", label: "右边距" }, { key: "bottom", label: "下边距" }, { key: "left", label: "左边距" }] as const;
const mount = ref<HTMLElement>(), range = ref("all"), index = ref(0), busy = ref(false), actionError = ref("");
const lifetime = new AbortController();
/** Revokes preparation at the session close intent, before dialog animation/unmount. */
function cancel(): void { lifetime.abort(); }
props.request.signal.addEventListener("abort", cancel, { once: true });
if (props.request.signal.aborted) cancel();
onBeforeUnmount(() => { props.request.signal.removeEventListener("abort", cancel); cancel(); });
// Print defaults use light paper semantics even when editor chrome is dark.
// Explicit node colours remain authoritative inside the frozen source.
const { snapshot, loading, error: projectionError, retry } = useFlowExportPreview(mount, props.request, range, createTheme({ scheme: "light" }), props.request.signal);
const settings = computed(() => {
  const values = Object.values(margins);
  if (values.some(value => !value.trim()) || (scaleMode.value === "fixed" && !scale.value.trim())) return undefined;
  try { return readFlowchartPageSettings({ paper: paper.value, orientation: orientation.value, margins: { top: Number(margins.top), right: Number(margins.right), bottom: Number(margins.bottom), left: Number(margins.left) }, scale: scaleMode.value === "fit" ? "fit" : Number(scale.value) / 100 }); }
  catch { return undefined; }
});
const { plan, error: planError, url } = useFlowPagePreview(snapshot, settings, index);
const message = computed(() => actionError.value || projectionError.value || planError.value || (!settings.value ? "请输入有效页边距和 10%–400% 的比例" : ""));
const ready = computed(() => !busy.value && !loading.value && !!snapshot.value && !!settings.value && !!plan.value);
const contentStyle = computed(() => plan.value ? { left: `${plan.value.settings.margins.left / plan.value.paperWidth * 100}%`, top: `${plan.value.settings.margins.top / plan.value.paperHeight * 100}%`, width: `${(plan.value.paperWidth - plan.value.settings.margins.left - plan.value.settings.margins.right) / plan.value.paperWidth * 100}%`, height: `${(plan.value.paperHeight - plan.value.settings.margins.top - plan.value.settings.margins.bottom) / plan.value.paperHeight * 100}%` } : undefined);
/** Confirms physical metadata once through the live owner/version guard. */
function save(): void {
  if (!ready.value || props.readOnly || !settings.value) return;
  try { props.apply(settings.value); emit("close"); } catch (reason) { actionError.value = reason instanceof Error ? reason.message : String(reason); }
}
/** @param download - Download static print HTML instead of invoking the native print dialog. @returns Completion of explicit output preparation. */
async function output(download: boolean): Promise<void> {
  const source = snapshot.value, page = settings.value; if (!ready.value || !source || !page) return;
  busy.value = true; actionError.value = "";
  try {
    const html = createFlowPrintDocument(source, page, document, t("流程图")); lifetime.signal.throwIfAborted();
    if (download) downloadFlowBlob(new Blob([html], { type: "text/html;charset=utf-8" }), "html", locale.value);
    else await printFlowDocument(document, html, lifetime.signal);
  } catch (reason) { if (!lifetime.signal.aborted) actionError.value = reason instanceof Error ? reason.message : String(reason); }
  finally { busy.value = false; }
}
/** @returns Completion of one cancellable vector PDF download using the frozen source and current page draft. */
async function pdf(): Promise<void> {
  const source = snapshot.value, page = settings.value; if (!ready.value || !source || !page) return;
  busy.value = true; actionError.value = "";
  try {
    const { encodeFlowchartPdf } = await import("@quirekit/flowchart-pdf"); lifetime.signal.throwIfAborted();
    const bytes = await encodeFlowchartPdf(source, page, document, { signal: lifetime.signal, title: t("流程图") });
    lifetime.signal.throwIfAborted(); downloadFlowBlob(new Blob([bytes], { type: "application/pdf" }), "pdf", locale.value);
  } catch (reason) { if (!lifetime.signal.aborted) actionError.value = reason instanceof Error ? reason.message : String(reason); }
  finally { busy.value = false; }
}
</script>
<template>
  <QuireDialogContent :title="t('页面与打印')" :description="t('设置纸张并预览分页，可直接下载 PDF 或打印。')" size="large" class="qk-flow-pages" :error-text="failure(message)" :busy="busy">
    <div class="qk-flow-pages__body">
      <div class="qk-flow-pages__preview">
        <div class="qk-flow-pages__paper" :style="{ aspectRatio: plan ? `${plan.paperWidth} / ${plan.paperHeight}` : '210 / 297', width: `min(100%, calc(var(--qk-flow-page-preview-height) * ${plan ? plan.paperWidth / plan.paperHeight : 210 / 297}))` }">
          <div v-if="url && plan" class="qk-flow-pages__content" :style="contentStyle"><img :src="url" :alt="t('打印页面预览')" /></div>
          <span v-else class="qk-flow-pages__placeholder">{{ loading ? t('生成预览…') : t('预览暂不可用') }}</span>
        </div>
        <nav class="qk-flow-pages__navigation" :aria-label="t('分页预览')">
          <QuireIconButton variant="ghost" :label="t('上一页')" :disabled="busy || !plan || index === 0" @click="index--"><QuireIcon name="chevronLeft" /></QuireIconButton>
          <output>{{ plan ? t('第 {page} 页，共 {total} 页', { page: index + 1, total: plan.pages.length }) : '—' }}</output>
          <QuireIconButton variant="ghost" :label="t('下一页')" :disabled="busy || !plan || index >= plan.pages.length - 1" @click="index++"><QuireIcon name="chevronRight" /></QuireIconButton>
        </nav>
      </div>
      <div class="qk-flow-pages__settings">
        <QuireField width="100%" :label="t('纸张')"><QuireSegmented v-model="paper" :label="t('纸张')" :disabled="busy" :items="[{ value: 'A4', label: 'A4' }, { value: 'A3', label: 'A3' }]" /></QuireField>
        <QuireField width="100%" :label="t('方向')"><QuireSegmented v-model="orientation" :label="t('方向')" :disabled="busy" :items="[{ value: 'portrait', label: t('纵向') }, { value: 'landscape', label: t('横向') }]" /></QuireField>
        <QuireField width="100%" class="qk-flow-pages__scale-setting" :label="t('打印比例')"><QuireSegmented v-model="scaleMode" :label="t('打印比例')" :disabled="busy" :items="[{ value: 'fit', label: t('适合单页') }, { value: 'fixed', label: t('固定比例') }]" /></QuireField>
        <QuireField width="100%" v-if="scaleMode === 'fixed'" :label="t('比例')"><template #meta>%</template><QuireInputNumber v-model="scale" :label="t('比例')" :disabled="busy" :min="10" :max="400" :step="10" :clamp-value-on-blur="false" width="100%" /></QuireField>
        <div class="qk-flow-pages__margins">
          <QuireField width="100%" v-for="inset in insets" :key="inset.key" :label="t(inset.label)"><template #meta>mm</template><QuireInputNumber v-model="margins[inset.key]" :label="t(inset.label)" :disabled="busy" :min="0" :max="80" :step="1" :clamp-value-on-blur="false" width="100%" /></QuireField>
        </div>
        <p v-if="plan" class="qk-flow-pages__summary">{{ t('{columns} 列 × {rows} 行 · 实际比例 {scale}%', { columns: plan.columns, rows: plan.rows, scale: (plan.scale * 100).toFixed(1) }) }}</p>
        <p>{{ t('虚线仅显示可打印区域。打印使用白色纸张，保留图形指定颜色。') }}</p>
      </div>
    </div>
    <div ref="mount" class="qk-flow-pages__renderer" aria-hidden="true" inert></div>
    <template #footer>
      <QuireButton v-if="projectionError && !snapshot" variant="ghost" @click="retry">{{ t('重新生成预览') }}</QuireButton>
      <QuireButton variant="ghost" @click="emit('close')">{{ t('关闭') }}</QuireButton>
      <QuireButton variant="outline" :disabled="!ready" @click="output(true)">{{ t('下载打印文件') }}</QuireButton>
      <QuireButton variant="outline" :disabled="!ready" @click="output(false)">{{ t('打印 / 保存 PDF') }}</QuireButton>
      <QuireButton variant="outline" :disabled="!ready" @click="pdf">{{ t('下载 PDF') }}</QuireButton>
      <QuireButton color="primary" variant="solid" :disabled="!ready || readOnly" @click="save">{{ t('保存页面设置') }}</QuireButton>
    </template>
  </QuireDialogContent>
</template>
