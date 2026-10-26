<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { QuireButton, QuireCheckbox, QuireColorPicker, QuireDialogContent, QuireField, QuireFileUpload, QuireImageCropper, QuireInput, QuireSegmented } from "@quirekit/ui/vue";
import { createFlowchartIcon, flowchartIconPaths, flowchartImageSourceRect, readFlowchartImage, type FlowchartIcon, type FlowchartImage, type FlowchartImageCrop } from "@quirekit/flowchart";
import { normalizeHexColor, type QuireKitFileUploadChangeDetails, type QuireKitTheme } from "@quirekit/ui";
import { importFlowImage } from "../../media/import";
import { useFlowMessages } from "../messages";
import type { FlowMediaRequest } from "./types";
import MediaPreview from "./preview.vue";

const props = defineProps<{ /** Frozen source task. */ request: FlowMediaRequest; /** Current host theme for the initial icon color. */ theme: QuireKitTheme; /** Guarded commit. */ apply: (image: FlowchartImage) => void }>();
const emit = defineEmits<{ close: [] }>();
const { t, failure } = useFlowMessages(), lifetime = new AbortController();
const tab = ref<string>(props.request.tab), uploadHost = ref<HTMLElement>(), files = ref<File[]>([]), image = ref(props.request.node?.image), alt = ref(props.request.node?.image?.alt ?? ""), color = ref(props.theme.scheme === "dark" ? "#cbd5e1" : "#475569"), icon = ref<FlowchartIcon>(), busy = ref(false), error = ref(""), composing = ref(false);
const crop = ref<FlowchartImageCrop>({ ...(image.value?.crop ?? { top: 0, right: 0, bottom: 0, left: 0 }) }),
  fit = ref<string>(image.value?.fit ?? "contain"), lockedRatio = ref(image.value?.lockAspectRatio ?? !props.request.node),
  cropping = ref(false), cropReady = ref(false), cropper = ref<InstanceType<typeof QuireImageCropper>>();
let generation = 0;
let selectedFile: File | undefined;
onBeforeUnmount(() => { generation++; lifetime.abort(); });
const names: Record<FlowchartIcon, string> = { cloud: "云服务", server: "服务器", database: "数据库", browser: "浏览器", mobile: "移动端", user: "用户", mail: "邮件", shield: "安全", folder: "文件夹", network: "网络", globe: "互联网", lock: "权限" };
const icons = computed(() => (Object.keys(flowchartIconPaths) as FlowchartIcon[]).map(id => ({ id, label: t(names[id]), image: createFlowchartIcon(id, normalizeHexColor(color.value) ?? "#475569") })));
const original = computed(() => icon.value ? createFlowchartIcon(icon.value, normalizeHexColor(color.value) ?? "#475569", alt.value) : image.value);
const draft = computed(() => original.value ? { dataUrl: original.value.dataUrl, width: original.value.width, height: original.value.height, alt: alt.value,
  ...(Object.values(crop.value).some(value => value !== 0) ? { crop: crop.value } : {}),
  fit: fit.value as "contain" | "cover", lockAspectRatio: lockedRatio.value === true } : undefined);
const frame = computed(() => props.request.node ?? (draft.value ? flowchartImageSourceRect(draft.value) : { width: 1, height: 1 }));
/** @param id - Chosen built-in asset. Keeps icon color dynamic in this draft only. */
function choose(id: FlowchartIcon): void { generation++; busy.value = false; selectedFile = undefined; files.value = []; icon.value = id; alt.value = t(names[id]); crop.value = { top: 0, right: 0, bottom: 0, left: 0 }; cropping.value = false; error.value = ""; }
/** Opens the public cropper with a local source draft; only final dialog confirmation edits the graph. */
function openCrop(): void { if (!original.value || busy.value) return; cropReady.value = false; cropping.value = true; error.value = ""; }
/** @returns Whether the public component currently owns a valid, model-admitted source region. */
function captureCrop(): boolean {
  if (!cropping.value) return true;
  const result = cropper.value?.getCrop(); if (!result || !draft.value) return false;
  try { readFlowchartImage({ ...draft.value, crop: result.crop }); crop.value = { ...result.crop }; return true; }
  catch (reason) { error.value = reason instanceof Error ? reason.message : String(reason); return false; }
}
/** Returns to the settings preview while retaining the current source draft. */
function finishCrop(): void { if (captureCrop()) cropping.value = false; }
/** @param reason - Public cropper loading or geometry failure. */
function failCrop(reason: Error): void { cropReady.value = false; error.value = reason.message; }
/** @param details - Public validated file collection. @returns Completion of decoding for only the latest live request. */
async function upload(details: QuireKitFileUploadChangeDetails): Promise<void> {
  const file = details.acceptedFiles[0], host = uploadHost.value;
  if (file === selectedFile || !host) return;
  selectedFile = file;
  const token = ++generation; error.value = "";
  // A rejected-file update does not decode the same asset again; removing a candidate restores the frozen source.
  if (!file) {
    busy.value = false; image.value = props.request.node?.image; icon.value = undefined; alt.value = image.value?.alt ?? "";
    crop.value = { ...(image.value?.crop ?? { top: 0, right: 0, bottom: 0, left: 0 }) }; cropping.value = false;
    return;
  }
  busy.value = true;
  try {
    const value = await importFlowImage(file, host.ownerDocument, lifetime.signal);
    if (token !== generation || lifetime.signal.aborted) return;
    image.value = value; icon.value = undefined; alt.value = value.alt; crop.value = { top: 0, right: 0, bottom: 0, left: 0 }; cropping.value = false;
  } catch (reason) { if (token === generation && !lifetime.signal.aborted) error.value = reason instanceof Error ? reason.message : String(reason); }
  finally { if (token === generation) busy.value = false; }
}
/** Applies the complete draft in one source command; cancel never mutates the graph. */
function save(): void { if (!draft.value || busy.value || composing.value || !captureCrop()) return; try { props.apply(readFlowchartImage(draft.value)); emit("close"); } catch (reason) { error.value = reason instanceof Error ? reason.message : String(reason); } }
</script>
<template>
  <QuireDialogContent :title="t(request.node ? '编辑图片' : '插入图片与图标')" :description="t('图片随图表保存，支持 PNG、JPEG、WebP 和静态 SVG。')" size="large" :error-text="failure(error)">
    <div class="qk-flow-media" @compositionstart="composing = true" @compositionend="composing = false">
      <div v-if="cropping && original" class="qk-flow-media__crop">
        <QuireImageCropper ref="cropper" v-model="crop" :src="original.dataUrl" :alt="alt" :height="320" @ready="cropReady = true" @error="failCrop" />
        <QuireButton variant="outline" icon="check" :disabled="!cropReady" @click="finishCrop">{{ t('完成裁剪') }}</QuireButton>
        <p>{{ t('只调整可见范围，原图保留在图表中。') }}</p>
      </div>
      <div v-else class="qk-flow-media__chooser">
        <QuireSegmented v-model="tab" class="justify-self-start" :label="t('图片来源')" :items="[{ value: 'upload', label: t('上传图片') }, { value: 'icons', label: t('常用图标') }]" :disabled="busy" />
        <div v-if="tab === 'upload'" ref="uploadHost" class="qk-flow-media__upload">
          <QuireFileUpload v-model="files" :label="t('选择图片文件')" :description="t('拖放图片到这里，或点击选择')" :hint="t('单个文件最多 8 MB；图片内容与尺寸会在导入时检查。')" :accept="{ 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'], 'image/svg+xml': ['.svg'] }" :max-file-size="8e6" :disabled="busy" :invalid="!!error" @file-change="upload" />
          <span v-if="busy" role="status">{{ t('正在读取图片…') }}</span>
        </div>
        <div v-else class="qk-flow-media__icons" role="group" :aria-label="t('常用图标')">
          <QuireButton v-for="item in icons" :key="item.id" class="qk-flow-media__icon-button" variant="ghost" :aria-label="item.label" :aria-pressed="icon === item.id" @click="choose(item.id)"><span class="qk-flow-media__icon"><img :src="item.image.dataUrl" alt="" /><span>{{ item.label }}</span></span></QuireButton>
        </div>
      </div>
      <div class="qk-flow-media__details">
        <div class="qk-flow-media__preview"><MediaPreview v-if="draft" :image="draft" :width="frame.width" :height="frame.height" /><span v-else>{{ t('选择图片或图标') }}</span></div>
        <QuireButton v-if="draft && !cropping" variant="outline" icon="crop" :disabled="busy" @click="openCrop">{{ t('裁剪图片…') }}</QuireButton>
        <QuireSegmented v-if="draft" v-model="fit" equal :label="t('图框适应方式')" :items="[{ value: 'contain', label: t('完整显示') }, { value: 'cover', label: t('填满图框') }]" :disabled="busy" />
        <QuireCheckbox v-if="draft" v-model:checked="lockedRatio" :label="t('锁定缩放比例')" :description="t('拖动调整尺寸时保留图框比例。')" :disabled="busy" />
        <QuireField :label="t('图片说明')" width="100%" v-slot="{ controlProps }"><QuireInput v-bind="controlProps" v-model="alt" :maxlength="200" width="100%" /></QuireField>
        <QuireColorPicker v-if="icon" v-model="color" :label="t('图标颜色')" :show-alpha="false" :allow-reset="false" />
      </div>
    </div>
    <template #footer><QuireButton variant="outline" @click="emit('close')">{{ t('取消') }}</QuireButton><QuireButton color="primary" variant="solid" :disabled="!draft || busy || composing || (cropping && !cropReady)" @click="save">{{ t(request.node ? '应用图片' : '插入图片') }}</QuireButton></template>
  </QuireDialogContent>
</template>
<style scoped>
.qk-flow-media { display: grid; grid-template-columns: minmax(0,1fr) 210px; gap: 24px; }
.qk-flow-media__chooser, .qk-flow-media__details, .qk-flow-media__crop { display: grid; align-content: start; gap: 16px; min-width: 0; }
.qk-flow-media__crop p { margin: 0; font-size: 12px; color: var(--qk-color-text-secondary); }
.qk-flow-media__icons { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 8px; }
.qk-flow-media__icon-button { height: auto; padding: 12px 4px; }
.qk-flow-media__icon { display: grid; justify-items: center; gap: 8px; }
.qk-flow-media__icons img { width: 32px; height: 32px; }
.qk-flow-media__icons span { font-size: 12px; }
.qk-flow-media__icons [aria-pressed=true] { background: var(--qk-color-surface-selected); outline: 1px solid var(--qk-color-action-primary); }
.qk-flow-media__upload { display: grid; gap: 12px; color: var(--qk-color-text-secondary); min-width: 0; }
.qk-flow-media__preview { display: grid; place-items: center; height: 150px; border: 1px solid var(--qk-color-border-subtle); border-radius: var(--qk-radius-control); background: var(--qk-color-surface-page); }
.qk-flow-media__preview svg { width: calc(100% - 24px); height: 126px; }
@media (max-width: 680px) { .qk-flow-media { grid-template-columns: minmax(0,1fr); } .qk-flow-media__details { grid-template-columns: minmax(0,1fr); align-items: start; } .qk-flow-media__preview { height: 100px; } .qk-flow-media__preview svg { height: 76px; } }
</style>
