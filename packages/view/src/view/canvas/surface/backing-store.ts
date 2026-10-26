import type { Canvas2DRenderTarget } from "@quirekit/renderer";
import type { CanvasSurfaceSize } from "../types";
import { resolveCanvasSurfaceBackingSize } from "./size";

/**
 * Resolves the Canvas 2D target for a mounted surface.
 *
 * @param canvas - Canvas surface that may expose a 2D context.
 * @returns Canvas 2D target when available.
 */
export function resolveCanvasSurfaceTarget(
  canvas: HTMLCanvasElement
): Canvas2DRenderTarget | undefined {
  const context = canvas.getContext("2d");

  if (!context) {
    return undefined;
  }

  return context as Canvas2DRenderTarget;
}

/**
 * Synchronizes one canvas backing store and render transform.
 *
 * @param canvas - Canvas element to resize.
 * @param target - Canvas rendering target when available.
 * @param displaySize - CSS-sized canvas dimensions.
 * @param devicePixelRatio - Device pixel ratio used for backing dimensions.
 */
export function syncCanvasSurfaceBackingStore(
  canvas: HTMLCanvasElement,
  target: Canvas2DRenderTarget | undefined,
  displaySize: CanvasSurfaceSize,
  devicePixelRatio: number
): void {
  const backingSize = resolveCanvasSurfaceBackingSize({
    displaySize,
    devicePixelRatio
  });

  if (canvas.width !== backingSize.width) {
    canvas.width = backingSize.width;
  }

  if (canvas.height !== backingSize.height) {
    canvas.height = backingSize.height;
  }

  if (typeof (target as CanvasRenderingContext2D | undefined)?.setTransform === "function") {
    (target as CanvasRenderingContext2D).setTransform(
      devicePixelRatio,
      0,
      0,
      devicePixelRatio,
      0,
      0
    );
  }
}
