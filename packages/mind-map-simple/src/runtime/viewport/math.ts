/** @param value - Requested scale. @returns A finite zoom ratio inside the supported range. */
export function clampMindMapZoom(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Mind map zoom must be finite");
  return Math.min(3, Math.max(0.1, value));
}

/** @param delta - Standard wheel delta. @param mode - Pixel/line/page unit. @param page - Viewport extent. @returns Bounded CSS pixel delta. */
export function wheelPixels(delta: number, mode: number, page: number): number {
  if (!Number.isFinite(delta)) return 0;
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? page : 1);
  return Math.max(-160, Math.min(160, pixels));
}

/** @param x - Accumulated horizontal motion. @param y - Accumulated vertical motion. @returns Vector capped to 96 CSS pixels per frame. */
export function boundedPan(x: number, y: number): readonly [number, number] {
  const ratio = Math.min(1, 96 / Math.max(1, Math.hypot(x, y)));
  return [x * ratio, y * ratio];
}
