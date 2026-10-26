<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import QuireButton from '../button/button.vue';
import QuireSegmented from '../segmented/segmented.vue';
import QuireSelect from '../select/select.vue';
import QuireSlider from '../slider/slider.vue';
import { equalImageCrop, fullImageCrop, isImageCrop } from './geometry';
import { useQuireKitMessages } from '../locale-provider/context';
import CropperSession from './session.vue';
import { useCropperSource } from './use-source';
import type { QuireKitImageCrop, QuireKitImageCropExportOptions, QuireKitImageCropperProps, QuireKitImageCropResult } from './types';
const props = withDefaults(defineProps<QuireKitImageCropperProps>(), {
  height: 360, toolbar: true, grid: true, fixedCropArea: false, disabled: false
});
/** Non-destructive source crop; source replacement uses the current model. */
const model = defineModel<QuireKitImageCrop>();
/** Output width / height; undefined enables free resizing. */
const aspectRatio = defineModel<number>('aspectRatio');
const emit = defineEmits<{ change: [result: QuireKitImageCropResult]; error: [error: Error]; ready: [result: QuireKitImageCropResult] }>();
const copy = useQuireKitMessages('imageCropper');
const source = useCropperSource(props, error => emit('error', error));
const host = shallowRef<HTMLElement | null>(null);
const session = shallowRef<InstanceType<typeof CropperSession> | null>(null);
const width = ref(0);
const revision = ref(0);
const mode = ref('frame');
const zoom = ref(1);
const current = shallowRef<QuireKitImageCropResult | null>(null);
const initial = shallowRef<QuireKitImageCrop>(model.value && isImageCrop(model.value) ? { ...model.value } : fullImageCrop);
const ratio = computed(() => Number.isFinite(aspectRatio.value) && (aspectRatio.value ?? 0) > 0 ? aspectRatio.value : undefined);
const fixed = computed(() => props.fixedCropArea || mode.value === 'pan');
const size = computed(() => {
  const natural = source.size.value;
  if (!natural || width.value <= 0) return null;
  const maxHeight = Number.isFinite(props.height) ? Math.max(80, props.height) : 360;
  const scale = Math.min(width.value / natural.width, maxHeight / natural.height);
  return { width: natural.width * scale, height: natural.height * scale };
});
const sessionKey = computed(() => `${revision.value}:${size.value?.width}:${size.value?.height}`);
const ratioItems = computed(() => [
  { value: 'free', label: copy.value.free }, { value: '1', label: '1:1' },
  { value: String(4 / 3), label: '4:3' }, { value: String(16 / 9), label: '16:9' },
  ...(ratio.value && ![1, 4 / 3, 16 / 9].includes(ratio.value) ? [{ value: String(ratio.value), label: copy.value.custom }] : [])
]);
let observer: ResizeObserver | undefined;
let lastEmitted: QuireKitImageCrop | undefined;
let announced = false;
let restoreFocus = false;
/** Starts a fresh Ark session using normalized source geometry.
 * @param crop - Source geometry to restore.
 */
function restart(crop: QuireKitImageCrop): void {
  restoreFocus ||= !!host.value?.contains(host.value.ownerDocument.activeElement);
  initial.value = { ...crop };
  current.value = null;
  announced = false;
  zoom.value = 1;
  revision.value++;
}
watch([() => props.src, () => props.crossorigin, () => props.referrerpolicy, source.attempt], () => {
  lastEmitted = undefined;
  restart(model.value && isImageCrop(model.value) ? model.value : fullImageCrop);
}, { flush: 'sync' });
watch(model, value => {
  if (value && !isImageCrop(value)) { emit('error', new RangeError('Image crop must contain finite nonnegative insets with a nonempty visible area.')); return; }
  const next = value ?? fullImageCrop;
  if (lastEmitted && equalImageCrop(next, lastEmitted)) return;
  restart(next);
}, { deep: true, flush: 'sync' });
watch(fixed, () => {
  // Pan mode only covers the frame. Rebase source geometry before editable handles can expose its margins.
  if (current.value) restart(current.value.crop);
}, { flush: 'sync' });
watch(size, () => {
  restoreFocus ||= !!host.value?.contains(host.value.ownerDocument.activeElement);
  // A resized viewport restores source insets instead of reusing stale CSS pan offsets.
  if (current.value) initial.value = { ...current.value.crop };
  current.value = null;
  announced = false;
}, { flush: 'sync' });
onMounted(() => {
  if (model.value && !isImageCrop(model.value)) emit('error', new RangeError('Invalid initial image crop.'));
  if (!host.value) return;
  let settled = false;
  let measuring = false;
  let pendingWidth = 0;
  observer = new ResizeObserver(async entries => {
    pendingWidth = entries[0]?.contentRect.width ?? 0;
    if (settled) { width.value = pendingWidth; return; }
    if (measuring) return;
    measuring = true;
    // Wait for finite ancestor opening animations so Ark does not measure a scaled dialog.
    const animations: Animation[] = [];
    for (let element: HTMLElement | null = host.value; element; element = element.parentElement) {
      animations.push(...element.getAnimations().filter(animation =>
        animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity));
    }
    await Promise.allSettled(animations.map(animation => animation.finished));
    settled = true;
    if (host.value) width.value = pendingWidth;
  });
  observer.observe(host.value);
});
onBeforeUnmount(() => observer?.disconnect());
/** @param result - Geometry produced by the current Ark session. */
function update(result: QuireKitImageCropResult): void {
  current.value = result;
  lastEmitted = result.crop;
  if (!model.value || !equalImageCrop(model.value, result.crop)) model.value = { ...result.crop };
  emit('change', result);
  if (!announced) {
    announced = true;
    emit('ready', result);
    if (restoreFocus) {
      restoreFocus = false;
      void nextTick(() => {
        // Do not steal focus if the consumer moved to another control while the image loaded.
        const doc = host.value?.ownerDocument;
        if (doc && doc.activeElement === doc.body) session.value?.focusSelection();
      });
    }
  }
}
/** @param error - Failure from the actual mounted image after its preload. */
function failSession(error: Error): void {
  source.failed.value = true;
  current.value = null;
  emit('error', error);
}
/** @param value - Selected ratio token. */
function selectRatio(value: string | undefined): void { aspectRatio.value = value === 'free' || !value ? undefined : Number(value); }
/** @param values - Slider percent values. */
function setZoom(values: number[] | undefined): void { session.value?.setZoom((values?.[0] ?? 100) / 100); }
/** @param event - Interaction blocked before upstream listeners when disabled. */
function blockDisabled(event: Event): void {
  if (!props.disabled) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}
/** @returns Current valid source crop, or null during loading or replacement. */
function getCrop(): QuireKitImageCropResult | null { return source.failed.value || !source.size.value ? null : session.value?.getCrop() ?? null; }
/** Restores the largest centered region allowed by the selected aspect ratio. */
function reset(): void { if (!props.disabled) restart(fullImageCrop); }
/** @param options - Requested raster export. @returns Blob produced from the current source. */
async function getCroppedImage(options?: QuireKitImageCropExportOptions): Promise<Blob> {
  const active = session.value;
  if (!active || !getCrop()) throw new Error('Image cropper is not ready.');
  return active.getCroppedImage(options);
}
defineExpose({ getCrop, reset, getCroppedImage });
</script>
<template>
  <section class="qk-image-cropper" :aria-label="copy.label" :data-disabled="disabled ? '' : undefined">
    <div v-if="toolbar" class="qk-image-cropper__toolbar">
      <QuireSegmented v-if="!fixedCropArea" v-model="mode" :label="copy.label" :items="[{ value: 'frame', label: copy.frame }, { value: 'pan', label: copy.pan }]" :disabled="disabled || !current" />
      <QuireSelect :model-value="ratio ? String(ratio) : 'free'" :items="ratioItems" :label="copy.aspectRatio" :disabled="disabled || !current" class="qk-image-cropper__ratio" @update:model-value="selectRatio" />
      <QuireButton variant="outline" :disabled="disabled || !current" class="qk-image-cropper__reset" @click="reset">{{ copy.reset }}</QuireButton>
    </div>
    <div ref="host" class="qk-image-cropper__stage" :style="{ minHeight: `${Math.min(160, height)}px` }"
      @pointerdown.capture="blockDisabled" @wheel.capture="blockDisabled" @touchstart.capture="blockDisabled" @touchmove.capture="blockDisabled" @keydown.capture="blockDisabled">
      <div v-if="source.failed.value" class="qk-image-cropper__status" role="alert">
        <span>{{ copy.unavailable }}</span><QuireButton variant="outline" :disabled="disabled" @click="source.retry">{{ copy.retry }}</QuireButton>
      </div>
      <CropperSession v-else-if="size" :key="sessionKey" ref="session" :src="src" :alt="alt" :size="size" :source-image="source.loadedImage.value" :initial="initial" :ratio="ratio" :copy="copy"
        :grid="grid" :fixed-crop-area="fixed" :disabled="disabled" :crossorigin="crossorigin" :referrerpolicy="referrerpolicy"
        :inert="disabled || undefined" @change="update" @error="failSession" @zoom="zoom = $event" />
      <div v-else class="qk-image-cropper__status" role="status">{{ copy.loading }}</div>
    </div>
    <div v-if="toolbar" class="qk-image-cropper__footer">
      <QuireSlider :label="copy.zoom" :model-value="[Math.round(zoom * 100)]" :min="100" :max="500" :step="1" unit="%" :disabled="disabled || !current" class="qk-image-cropper__zoom" @update:model-value="setZoom" />
      <span v-if="current" class="qk-image-cropper__dimensions">{{ current.outputSize.width }} × {{ current.outputSize.height }} px</span>
    </div>
    <p class="qk-image-cropper__help">{{ fixed ? copy.panInstructions : copy.instructions }}</p>
    <slot :result="current" :reset="reset" />
  </section>
</template>
