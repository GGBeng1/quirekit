import type { QuireRect } from "@quirekit/renderer";
import { resolveVisiblePageIndices } from "./visible-pages";
import type { ViewportCoordinator, ViewportCoordinatorOptions } from "./types";

/**
 * Creates a viewport coordinator over a scroll source.
 *
 * The coordinator is backend-neutral: it reads the visible region from the scroll
 * source and resolves the visible page set from caller-supplied page rectangles.
 * It owns no page geometry, so canvas, SVG, selection overlays, and the future
 * a11y mirror can share one coordinator and never disagree about live pages.
 *
 * @param options - Scroll source whose visible region drives the page set.
 * @returns Viewport coordinator bound to the scroll source.
 */
export function createViewportCoordinator(
  options: ViewportCoordinatorOptions
): ViewportCoordinator {
  const { scrollSource } = options;

  return {
    getVisibleRegion(): QuireRect {
      return scrollSource.getVisibleRegion();
    },
    getVisiblePageIndices(
      pageRects: readonly QuireRect[],
      bufferPages = 0
    ): number[] {
      return resolveVisiblePageIndices(
        pageRects,
        this.getVisibleRegion(),
        bufferPages
      );
    },
    subscribe(listener: () => void): () => void {
      return scrollSource.subscribe(listener);
    },
    destroy(): void {
      scrollSource.destroy();
    }
  };
}
