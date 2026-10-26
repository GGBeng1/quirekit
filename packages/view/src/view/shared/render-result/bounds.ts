import type { QuireRect } from "@quirekit/renderer";
import type { QuireViewRenderResult } from "../../types";

/**
 * Projects complete frame paint lists onto the mounted surface bounds.
 *
 * @param result - Complete frame whose commands and retained products remain owned by Engine.
 * @param bounds - Measured mounted surface bounds used by SVG viewBox presentation.
 * @returns Frame with surface-sized paint lists and unchanged retained products.
 */
export function withMountedRenderResultBounds(
  result: QuireViewRenderResult,
  bounds: QuireRect
): QuireViewRenderResult {
  // Surface sizing follows frame compilation. Persistent schema content and
  // provider controls stay distinct products, preserving every overlay and target.
  return {
    ...result,
    displayList: { ...result.displayList, bounds },
    contentDisplayList: { ...result.contentDisplayList, bounds },
    overlayDisplayList: { ...result.overlayDisplayList, bounds }
  };
}
