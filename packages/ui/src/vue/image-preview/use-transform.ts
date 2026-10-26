import { computed, ref, watch, type Ref } from 'vue';
import { anchoredPan, clampPan, fitScale, rotatedSize } from './geometry';
import type { PreviewPoint, PreviewSize } from './types';

/** @param viewport - Live stage dimensions. @returns Read-only image transform controls. */
export function useImageTransform(viewport: Ref<PreviewSize>) {
  const natural = ref<PreviewSize>({ width: 0, height: 0 });
  const ready = ref(false);
  const angle = ref(0);
  const scale = ref(1);
  const offset = ref<PreviewPoint>({ x: 0, y: 0 });
  const bounds = computed(() => rotatedSize(natural.value, angle.value));
  const fitted = ref(true);
  const fitRatio = computed(() => fitScale(bounds.value, viewport.value));
  const minimum = computed(() => Math.min(.1, fitRatio.value / 4));
  /** Restores the complete rotated image inside the stage. */
  function fit(): void { fitted.value = true; scale.value = fitRatio.value; offset.value = { x: 0, y: 0 }; }
  /** @param size - Loaded natural dimensions. */
  function load(size: PreviewSize): void { natural.value = size; ready.value = true; angle.value = 0; fit(); }
  /** @param point - Requested screen-coordinate center. */
  function panTo(point: PreviewPoint): void { offset.value = clampPan(point, bounds.value, viewport.value, scale.value); }
  /** @param value - Requested scale. @param anchor - Stage-centered pointer location. */
  function zoomTo(value: number, anchor: PreviewPoint = { x: 0, y: 0 }): void {
    if (!ready.value) return;
    fitted.value = false;
    const next = Math.min(8, Math.max(minimum.value, value));
    const center = anchoredPan(offset.value, anchor, next / scale.value);
    scale.value = next; panTo(center);
  }
  /** @param multiplier - Relative zoom factor. */
  function zoomBy(multiplier: number): void { zoomTo(scale.value * multiplier); }
  /** Shows one natural image pixel per CSS pixel. */
  function actual(): void { zoomTo(1); }
  /** @param direction - Positive for clockwise, negative for counterclockwise. */
  function rotate(direction = 1): void { if (ready.value) { angle.value = (angle.value + (direction < 0 ? 270 : 90)) % 360; fit(); } }
  /** @param point - Point kept beneath the pointer when zooming in. */
  function toggle(point: PreviewPoint): void { if (Math.abs(scale.value - fitRatio.value) > 0.001) fit(); else zoomTo(Math.max(1, fitRatio.value * 2), point); }
  // Resize follows fit only until the user chooses a zoom level.
  watch(fitRatio, () => {
    if (fitted.value) fit();
    else { scale.value = Math.max(minimum.value, scale.value); panTo(offset.value); }
  }, { flush: 'sync' });
  const imageStyle = computed(() => ({
    width: `${natural.value.width * scale.value}px`, height: `${natural.value.height * scale.value}px`,
    transform: `translate(-50%, -50%) translate(${offset.value.x}px, ${offset.value.y}px) rotate(${angle.value}deg)`
  }));
  return { ready, scale, angle, offset, minimum, fitRatio, imageStyle, load, fit, panTo, zoomTo, zoomBy, actual, rotate, toggle };
}
