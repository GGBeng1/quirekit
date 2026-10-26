import { onMounted, ref, shallowRef, watch } from 'vue';
import type { QuireKitImageCropperProps, QuireKitImageCropSize } from './types';

/** Loads one current source without allowing stale requests to replace its dimensions.
 * @param props - Current native image request inputs.
 * @param onError - Consumer failure notification.
 * @returns Reactive source state and retry action.
 */
export function useCropperSource(props: QuireKitImageCropperProps, onError: (error: Error) => void) {
  const mounted = ref(false);
  const attempt = ref(0);
  const loadedImage = shallowRef<HTMLImageElement | null>(null);
  const size = shallowRef<QuireKitImageCropSize | null>(null);
  const failed = ref(false);
  onMounted(() => { mounted.value = true; });
  watch([mounted, () => props.src, () => props.crossorigin, () => props.referrerpolicy, attempt], (_, __, cleanup) => {
    loadedImage.value = null;
    size.value = null;
    failed.value = false;
    if (!mounted.value) return;
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (!active) return;
      if (!image.naturalWidth || !image.naturalHeight) { image.onerror?.(new Event('error')); return; }
      loadedImage.value = image;
      size.value = { width: image.naturalWidth, height: image.naturalHeight };
    };
    image.onerror = () => {
      if (!active) return;
      failed.value = true;
      onError(new Error('Image cropper source could not be loaded.'));
    };
    if (props.crossorigin !== undefined) image.crossOrigin = props.crossorigin ?? '';
    if (props.referrerpolicy !== undefined) image.referrerPolicy = props.referrerpolicy ?? '';
    if (props.src) image.src = props.src;
    else image.onerror(new Event('error'));
    cleanup(() => { active = false; image.onload = null; image.onerror = null; image.removeAttribute('src'); });
  }, { immediate: true, flush: 'sync' });
  return { size, loadedImage, failed, attempt, retry: () => { attempt.value++; } };
}
