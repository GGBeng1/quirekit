<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, reactive, ref } from "vue";
import type { Editor } from "@quirekit/core";
import { QuireButton, QuireDialogRoot, QuireDialogContent, QuireField, QuireInput, QuireInputNumber, QuireCheckbox, QuireImageCropper, type QuireKitImageCropperApi } from "@quirekit/ui/vue";
import type { BlockMediaTarget } from "../../media/types";
import { readMediaPresentation } from "../../media/presentation";
import { updateBlockMedia } from "../../media/commands";

const { t } = useBlockLocale();
const props = defineProps<{
 /** Source-bound editing session. */ editor: Editor;
 /** Immutable original atom. */ target: BlockMediaTarget;
 /** Explicit object task. */ task: string;
 /** Original raster preview, not a modified raster. */ src: string;
 /** Actual visible width. */ width: number;
 /** Actual visible height. */ height: number;
 /** Available flow column. */ maximumWidth: number;
}>();
const emit = defineEmits<{ close: [] }>();
const media = readMediaPresentation(props.target.node.attrs.media);
const draft = reactive({ ...media, width: String(Math.round(props.width)), height: String(Math.round(props.height)) });
const crop = ref({ ...media.crop }), cropper = ref<QuireKitImageCropperApi>();
const error = ref("");
const title = computed(() => ({ crop: "裁剪图片", size: "图片尺寸", caption: "图片题注", link: "图片链接", metadata: "替代文本与图片信息" })[props.task] ?? "图片");
/** @param axis - Edited dimension. @param value - Numeric input draft. */
function dimension(axis: "width" | "height", value: string | number): void {
 draft[axis] = String(value);
 const number = Number(value);
 if (draft.lockAspectRatio && number > 0) draft[axis === "width" ? "height" : "width"] = String(Math.round(axis === "width" ? number * props.height / props.width : number * props.width / props.height));
}
/** Applies one task in one history transaction, rejecting stale objects. */
function apply(): void {
 let patch = {};
 if (props.task === "size") {
  const width = Number(draft.width), height = Number(draft.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 32 || height < 24 || width > props.maximumWidth || height > 4000) { error.value = t("宽度应为 32–{max} px，高度应为 24–4000 px", { max: Math.floor(props.maximumWidth) }); return; }
  patch = { width, height, lockAspectRatio: draft.lockAspectRatio };
 } else if (props.task === "crop") {
  const result = cropper.value?.getCrop(); if (!result) return;
  const width = props.width;
  const ratio = media.rotation % 180 ? result.outputSize.width / result.outputSize.height : result.outputSize.height / result.outputSize.width;
  patch = { crop: result.crop, width, height: Math.max(24, width * ratio) };
 } else if (props.task === "link") {
  if (draft.href && !/^(https?:\/\/|mailto:)/iu.test(draft.href)) { error.value = "请输入 http、https 或邮件链接"; return; }
  patch = { href: draft.href };
 } else patch = props.task === "caption" ? { caption: draft.caption } : { alt: draft.alt };
 if (!updateBlockMedia(props.editor, props.target, patch)) { error.value = "图片已变化，请关闭后重新选择"; return; }
 emit("close"); props.editor.commands.focus();
}
</script>
<template>
 <QuireDialogRoot open :restore-focus="false" @update:open="!$event && emit('close')">
  <QuireDialogContent :title="title" :size="task === 'crop' ? 'large' : 'small'" :error-text="t(error)" as="form" @submit.prevent="apply">
   <QuireImageCropper v-if="task === 'crop'" ref="cropper" v-model="crop" :src="src" :alt="media.alt || t('图片')" />
   <div v-else-if="task === 'size'" style="display:grid;gap:16px">
    <QuireField :label="t('宽度（px）')"><QuireInputNumber :label="t('图片宽度')" :min="32" :max="maximumWidth" :model-value="draft.width" @update:model-value="dimension('width', $event)" /></QuireField>
    <QuireField :label="t('高度（px）')"><QuireInputNumber :label="t('图片高度')" :min="24" :max="4000" :model-value="draft.height" @update:model-value="dimension('height', $event)" /></QuireField>
    <QuireCheckbox :label="t('锁定纵横比')" :checked="draft.lockAspectRatio" @update:checked="draft.lockAspectRatio = $event === true" />
   </div>
   <QuireField v-else :label="t(task === 'caption' ? t('题注') : task === 'link' ? t('链接地址') : t('替代文本'))">
    <QuireInput v-if="task === 'caption'" v-model="draft.caption" :aria-label="t('图片题注')" width="100%" />
    <QuireInput v-else-if="task === 'link'" v-model="draft.href" :aria-label="t('图片链接')" placeholder="https://example.com" width="100%" />
    <QuireInput v-else v-model="draft.alt" :aria-label="t('替代文本')" width="100%" />
   </QuireField>
   <template #footer><QuireButton variant="text" @click="emit('close')">{{ t("取消") }}</QuireButton><QuireButton type="submit">{{ t("应用") }}</QuireButton></template>
  </QuireDialogContent>
 </QuireDialogRoot>
</template>
