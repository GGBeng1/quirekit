import type { QuireRect } from "@quirekit/renderer";
import type {
  CanvasMountedRenderSurfaceState,
  CanvasMountedSurfaceMetrics
} from "../surface";

/**
 * Resolves page-stack coordinate bounds after layout reveals document height.
 *
 * Page-stack layout uses the visible viewport metrics for shaping and page
 * virtualization, but the pointer layer is sized to the full document after the
 * render result is available. Hit testing and input proxy placement must map the
 * pointer layer's full CSS height back to the same full document-space height,
 * or visual clicks lower in the document are scaled back toward the top pages.
 *
 * @param metrics - Visible mounted surface metrics used for the layout pass.
 * @param documentRect - Full layout document bounds, when the render produced one.
 * @returns Surface state whose coordinate bounds match the pointer layer.
 */
export function createCanvasPageStackSurfaceState(
  metrics: CanvasMountedSurfaceMetrics,
  documentRect: QuireRect | undefined
): CanvasMountedRenderSurfaceState {
  if (!documentRect) {
    return { ...metrics };
  }

  return {
    ...metrics,
    surfaceBounds: {
      x: 0,
      y: 0,
      width: metrics.surfaceBounds.width,
      height: Math.max(
        metrics.surfaceBounds.height,
        Math.ceil(documentRect.y + documentRect.height)
      )
    }
  };
}
