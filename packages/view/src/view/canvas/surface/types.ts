import type { Canvas2DRenderTarget, QuireRect } from "@quirekit/renderer";
import type {
  CanvasMountedViewElements,
  CanvasMountedViewRuntimeOptions,
  CanvasSurfaceSize
} from "../types";

/** Prepared canvas surface state for one mounted render pass. */
export interface CanvasMountedRenderSurfaceState {
  /**
   * Content canvas render target. Present only in single-surface mode; page-stack
   * mode paints per-page targets and leaves this undefined.
   */
  readonly contentTarget?: Canvas2DRenderTarget | undefined;
  /** Overlay canvas render target when available. */
  readonly overlayTarget?: Canvas2DRenderTarget | undefined;
  /** CSS-sized canvas dimensions. */
  readonly displaySize: CanvasSurfaceSize;
  /** Device pixel ratio used by backing stores. */
  readonly devicePixelRatio: number;
  /** Viewport rectangle used by layout and hit testing. */
  readonly viewportRect: QuireRect;
  /** Full mounted surface bounds used to clear paint targets. */
  readonly surfaceBounds: QuireRect;
}

/** Mounted surface state guaranteed to carry a single content paint target. */
export type CanvasMountedContentSurfaceState = CanvasMountedRenderSurfaceState & {
  /** Content canvas render target for the single-surface paint path. */
  readonly contentTarget: Canvas2DRenderTarget;
};

/** Inputs used to prepare mounted canvas surfaces for a render pass. */
export interface PrepareCanvasMountedRenderSurfacesOptions {
  /** DOM elements owned by the mounted canvas view. */
  readonly elements: CanvasMountedViewElements;
  /** Optional runtime viewport and sizing options. */
  readonly runtime?: CanvasMountedViewRuntimeOptions | undefined;
}
