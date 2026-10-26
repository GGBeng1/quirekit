<script setup lang="ts">
import { useFlowMessages } from "../messages";
import { computed, onBeforeUnmount, ref } from "vue";
import { QuireButton, QuireColorPicker, QuireDialogContent, QuireField, QuireInputNumber, QuireSegmented } from "@quirekit/ui/vue";
import { normalizeHexColor, type QuireKitTheme } from "@quirekit/ui";
import { flowchartImageSize, flowchartSnapshotBackground, rasterizeFlowchartSnapshot } from "@quirekit/flowchart-x6";
import { useFlowExportPreview } from "./preview";
import { downloadFlowBlob } from "../../ui/download";
import type { FlowExportRequest } from "./types";

const { t, locale, failure } = useFlowMessages();
const props = defineProps<{ /** Frozen source and initial file choice. */ request: FlowExportRequest; /** Opening visual theme. */ theme: QuireKitTheme }>();
const emit = defineEmits<{ /** Closes and cancels any unfinished download. */ close: [] }>();
const range = ref("all"), format = ref<string>(props.request.format), backgroundMode = ref("transparent"), color = ref("#FFFFFF"), colorDraft = ref("#FFFFFF"), scale = ref("2"), mount = ref<HTMLElement>();
const { snapshot, url, loading, error, retry } = useFlowExportPreview(mount, props.request, range, props.theme);
const busy = ref(false), lifetime = new AbortController(); onBeforeUnmount(() => lifetime.abort());
const valid = computed(() => Number.isFinite(Number(scale.value)) && Number(scale.value) > 0 && Number(scale.value) <= 8);
const size = computed(() => snapshot.value && valid.value ? flowchartImageSize(snapshot.value.width, snapshot.value.height, Number(scale.value)) : undefined);
/** @param value - Explicit picker commit; transient pointer previews never serialize the diagram. */
function commitColor(value: string): void { const next = normalizeHexColor(value); if (next) color.value = next; }
/** @returns Completion of the file built from the exact displayed snapshot and committed settings. */
async function download(): Promise<void> {
  const source = snapshot.value; if (!source || busy.value || (format.value === "png" && !valid.value)) return;
  busy.value = true; error.value = "";
  try {
    const background = backgroundMode.value === "solid" ? color.value : undefined;
    const blob = format.value === "svg"
      ? new Blob([flowchartSnapshotBackground(source, background, document).svg], { type: "image/svg+xml" })
      : await (await fetch(await rasterizeFlowchartSnapshot(source, { scale: Number(scale.value), ...(background ? { background } : {}) }, document, lifetime.signal))).blob();
    lifetime.signal.throwIfAborted(); downloadFlowBlob(blob, format.value === "svg" ? "svg" : "png", locale.value); emit("close");
  } catch (reason) { if (!lifetime.signal.aborted) error.value = reason instanceof Error ? reason.message : String(reason); }
  finally { busy.value = false; }
}
</script>
<template>
  <QuireDialogContent :title="t('导出图片')" :description="t('选择导出范围、背景和清晰度。')" size="large" class="qk-flow-export" :error-text="failure(error)" :busy="busy">
    <div class="qk-flow-export__body">
      <div class="qk-flow-export__preview" :class="{ 'qk-flow-export__preview--transparent': backgroundMode === 'transparent' }" :style="backgroundMode === 'solid' ? { backgroundColor: color } : undefined">
        <img v-if="url" :src="url" :alt="t('导出图片预览')" />
        <span v-else>{{ loading ? t('生成预览…') : t('预览暂不可用') }}</span>
      </div>
      <div class="qk-flow-export__settings">
        <QuireField :label="t('文件格式')"><QuireSegmented v-model="format" :label="t('文件格式')" :disabled="busy" :items="[{ value: 'png', label: 'PNG' }, { value: 'svg', label: 'SVG' }]" /></QuireField>
        <QuireField :label="t('导出范围')"><QuireSegmented v-model="range" :label="t('导出范围')" :disabled="busy" :items="[{ value: 'all', label: t('整张图') }, { value: 'selection', label: t('当前选区'), disabled: !request.ids.length }]" /></QuireField>
        <QuireField :label="t('背景')"><QuireSegmented v-model="backgroundMode" :label="t('图片背景')" :disabled="busy" :items="[{ value: 'transparent', label: t('透明') }, { value: 'solid', label: t('指定颜色') }]" /></QuireField>
        <QuireColorPicker v-if="backgroundMode === 'solid'" v-model="colorDraft" :label="t('导出背景色')" :disabled="busy" :show-alpha="false" :allow-reset="false" @commit="commitColor" @update:open="!$event && commitColor(colorDraft)" />
        <QuireField v-if="format === 'png'" :label="t('清晰度')" :invalid="!valid" :error-text="t('请输入大于 0 且不超过 8 的倍率')">
          <template #meta>{{ t('倍') }}</template>
          <QuireInputNumber v-model="scale" :label="t('导出倍率')" :disabled="busy" :min="0.1" :max="8" :step="0.5" :clamp-value-on-blur="false" width="100%" />
        </QuireField>
        <output v-if="snapshot" :aria-label="t('输出尺寸')">{{ format === 'svg' ? `${Math.ceil(snapshot.width)} × ${Math.ceil(snapshot.height)}` : size ? `${size.width} × ${size.height}` : '—' }} px</output>
        <p v-if="format === 'png' && size?.limited" role="status">{{ t('图片较大，已调整为 {scale} 倍，以保持图片可正常导出。', { scale: size.scale.toFixed(2) }) }}</p>
        <p v-else>{{ format === 'svg' ? t('矢量图片，可放大而不失真。') : t('倍率越高，图片越清晰，文件也更大。') }}</p>
      </div>
    </div>
    <div ref="mount" class="qk-flow-export__renderer" aria-hidden="true" inert></div>
    <template #footer>
      <QuireButton v-if="error && !snapshot" variant="ghost" @click="retry">{{ t('重新生成预览') }}</QuireButton>
      <QuireButton variant="outline" @click="emit('close')">{{ t('取消') }}</QuireButton>
      <QuireButton color="primary" variant="solid" :disabled="busy || loading || !snapshot || (format === 'png' && !valid)" @click="download">{{ t('下载图片') }}</QuireButton>
    </template>
  </QuireDialogContent>
</template>
<style scoped>
.qk-flow-export__body { display: grid; grid-template-columns: minmax(0, 1fr) 230px; gap: 24px; }
.qk-flow-export__preview { display: flex; align-items: center; justify-content: center; height: 360px; min-width: 0; border: 1px solid var(--qk-color-border-subtle); border-radius: var(--qk-radius-control); overflow: hidden; }
.qk-flow-export__preview--transparent { background-color: var(--qk-color-surface-page); background-image: conic-gradient(var(--qk-color-border-subtle) 25%, transparent 0 50%, var(--qk-color-border-subtle) 0 75%, transparent 0); background-size: 16px 16px; }
.qk-flow-export__preview img { width: 100%; height: 100%; object-fit: contain; }
.qk-flow-export__settings { display: grid; align-content: start; gap: 16px; }
.qk-flow-export__settings p { margin: 0; font-size: 12px; color: var(--qk-color-text-secondary); }
.qk-flow-export__settings output { font-size: 13px; font-variant-numeric: tabular-nums; }
.qk-flow-export__renderer { position: fixed; left: -20000px; top: 0; width: 1200px; height: 900px; visibility: hidden; pointer-events: none; }
@media (max-width: 700px) { .qk-flow-export__body { grid-template-columns: minmax(0, 1fr); gap: 16px; } .qk-flow-export__preview { height: 190px; } .qk-flow-export__settings { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
