import type {
  QuireViewLayerPaintSurface,
  QuireViewLayerPaintSurfaceInput
} from "../types";

/**
 * Resolves the mounted interactive paint surface for an editor layer plane.
 *
 * This is a compositor bridge, not an interaction authority: retained layer
 * planes still own z-order and pointer policy, while `content`/`overlay` here
 * only chooses the final surface pair used by Canvas/SVG/HTML painters.
 *
 * @param input - Retained layer reference to route to a paint surface.
 * @returns Last-mile paint surface used by mounted interactive renderers.
 */
export function resolveQuireViewLayerPaintSurface(
  input: QuireViewLayerPaintSurfaceInput
): QuireViewLayerPaintSurface {
  switch (input.layer.plane) {
    case "page-background":
    case "drawing-behind-content":
    case "content":
    case "page-chrome":
    case "drawing":
      return "content";
    case "selection":
    case "annotation":
    case "controls":
    case "dom-proxy":
    case "floating-ui":
      return "overlay";
  }
}
