import type { PreviewPoint, PreviewSize } from './types';

/** @param size - Natural dimensions. @param angle - Rotation in degrees. @returns Screen-aligned dimensions. */
export function rotatedSize(size: PreviewSize, angle: number): PreviewSize {
  return Math.abs(angle % 180) === 90 ? { width: size.height, height: size.width } : size;
}
/** @param image - Rotated natural dimensions. @param viewport - Stage dimensions. @returns Fit scale without enlarging small images. */
export function fitScale(image: PreviewSize, viewport: PreviewSize): number {
  if (image.width <= 0 || image.height <= 0 || viewport.width <= 0 || viewport.height <= 0) return 1;
  return Math.min(1, viewport.width / image.width, viewport.height / image.height);
}
/** @param point - Requested pan. @param image - Rotated natural dimensions. @param viewport - Stage dimensions. @param scale - Natural image scale. @returns Pan that never loses the image outside the viewport. */
export function clampPan(point: PreviewPoint, image: PreviewSize, viewport: PreviewSize, scale: number): PreviewPoint {
  const x = Math.max(0, (image.width * scale - viewport.width) / 2);
  const y = Math.max(0, (image.height * scale - viewport.height) / 2);
  return { x: x ? Math.max(-x, Math.min(x, point.x)) : 0, y: y ? Math.max(-y, Math.min(y, point.y)) : 0 };
}
/** @param offset - Existing image center. @param anchor - Fixed screen point. @param ratio - New scale divided by previous scale. @returns Center preserving the image point under the pointer. */
export function anchoredPan(offset: PreviewPoint, anchor: PreviewPoint, ratio: number): PreviewPoint {
  return { x: anchor.x - (anchor.x - offset.x) * ratio, y: anchor.y - (anchor.y - offset.y) * ratio };
}
