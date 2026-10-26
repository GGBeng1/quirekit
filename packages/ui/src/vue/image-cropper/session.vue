<script setup lang="ts">
import { ImageCropper, useImageCropper } from '@ark-ui/vue/image-cropper';
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue';
import { exportImageCrop } from './export';
import { projectImageCrop, sourceImageCrop } from './geometry';
import type { CropperSessionProps } from './session-types';
import type { QuireKitImageCropExportOptions, QuireKitImageCropResult } from './types';
const props = defineProps<CropperSessionProps>();
const emit = defineEmits<{ change: [result: QuireKitImageCropResult]; zoom: [zoom: number]; error: [error: Error] }>();
const api = useImageCropper(computed(() => ({
  initialCrop: projectImageCrop(props.initial, props.size, props.ratio),
  aspectRatio: props.ratio, minWidth: 1, minHeight: 1, minZoom: 1, maxZoom: 5,
  fixedCropArea: props.fixedCropArea,
  translations: {
    rootLabel: props.copy.root(props.alt), rootRoleDescription: props.copy.label,
    previewLoading: props.copy.loading, previewDescription: () => props.alt,
    selectionLabel: () => props.copy.selection, selectionRoleDescription: props.copy.selection,
    selectionInstructions: props.fixedCropArea ? props.copy.panInstructions : props.copy.instructions,
    selectionValueText: ({ width, height }) => `${Math.round(width)} × ${Math.round(height)}`
  }
})));
const root = shallowRef<HTMLElement | null>(null);
let active = true;
onBeforeUnmount(() => { active = false; });
/** @returns Exact source-space crop, independent of rounded upstream pixel bounds. */
function getCrop(): QuireKitImageCropResult | null {
  const value = api.value;
  if (!active || !value.naturalSize.width || !value.viewportRect.width || !value.crop.width) return null;
  // Ark owns interaction; project its floating-point viewport state before any DOM integer rounding.
  const { size } = props;
  const x = ((value.crop.x - size.width / 2 - value.offset.x) / value.zoom + size.width / 2) / size.width;
  const y = ((value.crop.y - size.height / 2 - value.offset.y) / value.zoom + size.height / 2) / size.height;
  const right = x + value.crop.width / value.zoom / size.width;
  const bottom = y + value.crop.height / value.zoom / size.height;
  const crop = sourceImageCrop(x, y, right, bottom, { width: 1, height: 1 });
  if (!crop) return null;
  return { crop, naturalSize: { ...value.naturalSize }, outputSize: {
    width: Math.max(1, Math.round((1 - crop.left - crop.right) * value.naturalSize.width)),
    height: Math.max(1, Math.round((1 - crop.top - crop.bottom) * value.naturalSize.height))
  } };
}
watch(() => [api.value.crop, api.value.offset, api.value.zoom, api.value.naturalSize, api.value.viewportRect], () => {
  const result = getCrop();
  if (result) emit('change', result);
  emit('zoom', api.value.zoom);
}, { flush: 'post' });
/** Uses Ark's ratio-aware resize path for its Alt-arrow shortcut gap.
 * @param event - Keyboard event from the crop selection.
 */
function resizeWithKeyboard(event: KeyboardEvent): void {
  if (!props.ratio || !event.altKey || props.fixedCropArea || props.disabled) return;
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  event.stopPropagation();
  const step = event.ctrlKey || event.metaKey ? 50 : event.shiftKey ? 10 : 1;
  api.value.resize(event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? 'e' : 's',
    step * (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1));
}
/** @param zoom - Requested source magnification. */
function setZoom(zoom: number): void { if (!props.disabled) api.value.setZoom(zoom); }
/** @param options - Explicit export options. @returns A current-session Blob or rejects. */
async function getCroppedImage(options: QuireKitImageCropExportOptions = {}): Promise<Blob> {
  const result = getCrop();
  const image = props.sourceImage;
  if (!result || !image) throw new Error('Image cropper is not ready.');
  const blob = await exportImageCrop(image, result, options);
  if (!active) throw new Error('Image cropper source changed during export.');
  return blob;
}
/** Restores keyboard editing after a source-preserving session replacement. */
function focusSelection(): void { if (!props.disabled) root.value?.querySelector<HTMLElement>('[data-part="selection"]')?.focus(); }
defineExpose({ getCrop, setZoom, getCroppedImage, focusSelection });
</script>
<template>
  <ImageCropper.RootProvider :value="api" class="qk-image-cropper__session" :style="{ width: `${size.width}px`, height: `${size.height}px` }">
    <div ref="root" class="qk-image-cropper__viewport"><ImageCropper.Viewport class="qk-image-cropper__viewport">
      <ImageCropper.Image :src="src" @error="emit('error', new Error('Image cropper source became unavailable.'))" :crossorigin="crossorigin" :referrerpolicy="referrerpolicy" class="qk-image-cropper__image" />
      <ImageCropper.Selection class="qk-image-cropper__selection" @keydown.capture="resizeWithKeyboard">
        <template v-if="grid"><ImageCropper.Grid axis="horizontal" class="qk-image-cropper__grid" /><ImageCropper.Grid axis="vertical" class="qk-image-cropper__grid" /></template>
        <template v-if="!fixedCropArea"><ImageCropper.Handle v-for="position in (['n','e','s','w','ne','se','sw','nw'] as const)" :key="position" :position="position" class="qk-image-cropper__handle"><span /></ImageCropper.Handle></template>
      </ImageCropper.Selection>
    </ImageCropper.Viewport></div>
  </ImageCropper.RootProvider>
</template>
