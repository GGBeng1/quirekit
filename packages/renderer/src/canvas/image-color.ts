import type { QuireImageColorAdjustment, QuireImageCommand } from "../core/display-list";

const adjustedImages = new WeakMap<object, { key: string; raster: CanvasImageSource }>();

/**
 * Applies portable channel adjustments before crop and destination transforms.
 * @param command - Resolved image command with source dimensions.
 * @returns Original source or a cached adjusted raster.
 */
export function resolveCanvasImageColors(command: QuireImageCommand): CanvasImageSource | undefined {
  const source = command.source;
  const effect = command.colorAdjustment;
  if (source === undefined || effect === undefined || (effect.slope === 1 && effect.intercept === 0)) return source;
  const image = typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement ? source : undefined;
  const key = `${effect.slope}:${effect.intercept}:${image?.currentSrc ?? image?.src ?? ''}`;
  // Only immutable decoded sources may reuse pixels. Video and source canvases can change in place.
  const stable = (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap)
    || (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement);
  const cached = stable ? adjustedImages.get(source) : undefined;
  if (cached?.key === key) return cached.raster;
  const size = command.sourceSize ?? sourceDimensions(source);
  if (!size || size.width <= 0 || size.height <= 0) throw new Error("Image color adjustment requires source dimensions.");
  const width = Math.round(size.width);
  const height = Math.round(size.height);
  const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(width, height)
    : typeof document !== "undefined" ? document.createElement("canvas") : undefined;
  if (canvas === undefined) throw new Error("Image color adjustment requires a raster canvas.");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (context === null) throw new Error("Image color adjustment requires a 2D canvas.");
  context.drawImage(source, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  adjustImageChannels(pixels.data, effect);
  context.putImageData(pixels, 0, 0);
  if (stable) adjustedImages.set(source, { key, raster: canvas });
  return canvas;
}

/** @param pixels - Mutable RGBA bytes. @param effect - Normalized sRGB transform. */
export function adjustImageChannels(pixels: Uint8ClampedArray, effect: QuireImageColorAdjustment): void {
  if (!Number.isFinite(effect.slope) || !Number.isFinite(effect.intercept)) throw new RangeError("Invalid image channel adjustment.");
  for (let index = 0; index < pixels.length; index += 4) {
    for (let channel = 0; channel < 3; channel++) pixels[index + channel] = pixels[index + channel]! * effect.slope + effect.intercept * 255;
  }
}

/** @param source - Runtime raster. @returns Intrinsic dimensions when exposed by the source. */
function sourceDimensions(source: CanvasImageSource): { width: number; height: number } | undefined {
  const value = source as { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number };
  const width = value.naturalWidth ?? value.width;
  const height = value.naturalHeight ?? value.height;
  return typeof width === "number" && typeof height === "number" ? { width, height } : undefined;
}
