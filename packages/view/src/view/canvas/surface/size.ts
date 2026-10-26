import type {
  CanvasSurfaceBackingSizeOptions,
  CanvasSurfaceDisplaySizeOptions,
  CanvasSurfaceSize
} from "../types";
import { mapQuireViewViewportSizeToCanvasPhysical } from "@quirekit/view-engine";

/**
 * Resolves the displayed Canvas 2D surface size from CSS layout.
 *
 * @param options - Display rectangle and fallback dimensions.
 * @returns Canvas display size in CSS pixels.
 */
export function resolveCanvasSurfaceDisplaySize(
  options: CanvasSurfaceDisplaySizeOptions
): CanvasSurfaceSize {
  if (options.rect.width > 0 && options.rect.height > 0) {
    return {
      width: options.rect.width,
      height: options.rect.height
    };
  }

  return options.fallback;
}

/**
 * Resolves the backing store size for a displayed Canvas 2D surface.
 *
 * @param options - Display size and device pixel ratio.
 * @returns Canvas backing store dimensions in physical pixels.
 */
export function resolveCanvasSurfaceBackingSize(
  options: CanvasSurfaceBackingSizeOptions
): CanvasSurfaceSize {
  const physicalSize = mapQuireViewViewportSizeToCanvasPhysical(
    {
      space: "viewport",
      width: options.displaySize.width,
      height: options.displaySize.height
    },
    options.devicePixelRatio
  );

  return {
    width: physicalSize.width,
    height: physicalSize.height
  };
}
