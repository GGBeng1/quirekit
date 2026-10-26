/**
 * Resolves a bitmap-capable 2D context.
 *
 * @param canvas - Canvas whose context should copy a bitmap.
 * @returns Bitmap-capable context when available.
 */
export function resolveBitmapContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | undefined {
  const context = canvas.getContext("2d");
  if (context === null || typeof context.drawImage !== "function") {
    return undefined;
  }
  return context;
}

/**
 * Resets a destination context to backing-store coordinates before bitmap restore.
 *
 * @param context - Destination context.
 */
export function resetBitmapTransform(context: CanvasRenderingContext2D): void {
  if (typeof context.setTransform === "function") {
    context.setTransform(1, 0, 0, 1, 0, 0);
  }
}
