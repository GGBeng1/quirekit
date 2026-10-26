import type { QuireKitImageCropExportOptions, QuireKitImageCropResult } from './types';

/** Exports exact natural-source geometry without Ark's integer offsetWidth projection.
 * @param image - Current loaded image element.
 * @param result - Snapshot of normalized source geometry.
 * @param options - Explicit raster encoding and output bounds.
 * @returns Cropped Blob, rejecting canvas security or encoding failures.
 */
export async function exportImageCrop(image: HTMLImageElement, result: QuireKitImageCropResult,
  options: QuireKitImageCropExportOptions = {}): Promise<Blob> {
  const maxSize = options.maxSize ?? { width: 4096, height: 4096 };
  if (![maxSize.width, maxSize.height].every(value => Number.isFinite(value) && value >= 1 && value <= 16384)
    || (options.quality !== undefined && (!Number.isFinite(options.quality) || options.quality < 0 || options.quality > 1))) {
    throw new RangeError('Invalid image crop export size or quality.');
  }
  const { crop, naturalSize } = result;
  const width = naturalSize.width * (1 - crop.left - crop.right);
  const height = naturalSize.height * (1 - crop.top - crop.bottom);
  const scale = Math.min(1, maxSize.width / width, maxSize.height / height);
  const canvas = image.ownerDocument.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable.');
  context.drawImage(image, crop.left * naturalSize.width, crop.top * naturalSize.height,
    width, height, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image encoding failed.')),
      options.type ?? 'image/png', options.quality ?? .92);
  });
}
