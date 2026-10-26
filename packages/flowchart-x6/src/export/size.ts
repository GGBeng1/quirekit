import type { FlowchartImageSize } from "./types";
/** @param width - SVG world width. @param height - SVG world height. @param requested - Requested PNG scale. @returns Actual allocation, bounded before creating a canvas. */
export function flowchartImageSize(width: number, height: number, requested = 2): FlowchartImageSize {
  if (![width, height, requested].every(n => Number.isFinite(n) && n > 0) || requested > 8) throw new RangeError("无效图片尺寸或倍率");
  const rw = Math.ceil(width * requested), rh = Math.ceil(height * requested);
  if (rw <= 8192 && rh <= 8192 && rw * rh <= 16e6) return { width: rw, height: rh, scale: requested, limited: false };
  const scale = Math.min(requested, 8192 / width, 8192 / height, Math.sqrt(16e6 / width / height));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)), scale, limited: scale < requested };
}
