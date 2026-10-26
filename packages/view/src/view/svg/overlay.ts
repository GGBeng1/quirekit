import type { QuireViewRenderResult } from "../types";
import type { SvgMountedRenderSurfaceState } from "./surface";
import type { SvgPageStackPresentation } from "./page-stack";

/** Options for repainting mounted SVG overlays. */
export interface RepaintSvgMountedOverlayOptions {
  /** Latest accepted render result, when available. */
  readonly renderResult: QuireViewRenderResult | undefined;
  /** Current document-space SVG surface state, when available. */
  readonly surfaceState: SvgMountedRenderSurfaceState | undefined;
  /** Backend page-stack presentation resource. */
  readonly pageStackPresentation: SvgPageStackPresentation;
  /** Whether retained caret commands should paint. */
  readonly caretVisible: boolean;
}

/** Options for repainting mounted SVG drawing previews. */
export interface RepaintSvgMountedDrawingPreviewOptions {
  /** Transient render products already committed by the runtime. */
  readonly renderResult: QuireViewRenderResult;
  /** Current document-space SVG surface state, when available. */
  readonly surfaceState: SvgMountedRenderSurfaceState | undefined;
  /** Backend page-stack presentation resource. */
  readonly pageStackPresentation: SvgPageStackPresentation;
  /** Whether retained caret commands should paint. */
  readonly caretVisible: boolean;
}

/**
 * Repaints backend-owned SVG overlays with the requested caret visibility.
 *
 * @param options - Render result, surface state, page-stack resource, and caret state.
 * @returns Nothing.
 */
export function repaintSvgMountedOverlayWithCaretVisibility(
  options: RepaintSvgMountedOverlayOptions
): void {
  if (options.renderResult === undefined || options.surfaceState === undefined) {
    return;
  }

  if (options.pageStackPresentation.getFrames().length > 0) {
    options.pageStackPresentation.repaintOverlays(
      options.renderResult,
      options.caretVisible
    );
  }
}

/**
 * Repaints transient drawing content and chrome on mounted SVG pages.
 *
 * @param options - Transient render result, surface state, page-stack resource, and caret state.
 * @returns Nothing.
 */
export function repaintSvgMountedDrawingPreview(
  options: RepaintSvgMountedDrawingPreviewOptions
): void {
  if (options.surfaceState === undefined) {
    return;
  }
  options.pageStackPresentation.repaintDrawingPreview(
    options.renderResult,
    options.caretVisible
  );
}
