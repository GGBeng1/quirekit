import type { QuireKitImageCrop, QuireKitImageCropSize } from './types';

/** Uncropped source geometry. */
export const fullImageCrop: QuireKitImageCrop = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });
/** @param crop - Untrusted public geometry. @returns Whether it describes a nonempty source rectangle. */
export function isImageCrop(crop: QuireKitImageCrop): boolean {
  return [crop.top, crop.right, crop.bottom, crop.left].every(value => Number.isFinite(value) && value >= 0)
    && crop.top + crop.bottom < 1 && crop.left + crop.right < 1;
}
/** @param a - First geometry. @param b - Second geometry. @returns Whether both represent the same source region. */
export function equalImageCrop(a: QuireKitImageCrop, b: QuireKitImageCrop): boolean {
  return (['top', 'right', 'bottom', 'left'] as const).every(edge => Math.abs(a[edge] - b[edge]) < 1e-8);
}
/** Projects source insets into a viewport, fitting a requested ratio inside that region.
 * @param crop - Valid normalized insets.
 * @param size - Viewport with the same aspect as the original image.
 * @param ratio - Optional positive output ratio.
 * @returns Viewport crop rectangle.
 */
export function projectImageCrop(crop: QuireKitImageCrop, size: QuireKitImageCropSize, ratio?: number) {
  let width = size.width * (1 - crop.left - crop.right);
  let height = size.height * (1 - crop.top - crop.bottom);
  const centerX = size.width * crop.left + width / 2;
  const centerY = size.height * crop.top + height / 2;
  if (ratio && Number.isFinite(ratio) && ratio > 0) {
    if (width / height > ratio) width = height * ratio;
    else height = width / ratio;
  }
  return { x: centerX - width / 2, y: centerY - height / 2, width, height };
}
/** Keeps floating-point edge noise out of persistent source geometry.
 * @param x - Natural source left.
 * @param y - Natural source top.
 * @param right - Natural source right.
 * @param bottom - Natural source bottom.
 * @param size - Natural source dimensions.
 * @returns Valid normalized insets, or null when no source pixels remain.
 */
export function sourceImageCrop(x: number, y: number, right: number, bottom: number, size: QuireKitImageCropSize): QuireKitImageCrop | null {
  const crop = { left: Math.max(0, x / size.width), top: Math.max(0, y / size.height),
    right: Math.max(0, 1 - right / size.width), bottom: Math.max(0, 1 - bottom / size.height) };
  return isImageCrop(crop) ? crop : null;
}
