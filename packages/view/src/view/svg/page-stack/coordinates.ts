import type { QuireRect } from "@quirekit/renderer";
import { withMountedRenderResultBounds } from "../../shared/render-result/bounds";
import type { QuireViewRenderResult } from "../../types";
import type { SvgMountedRenderSurfaceState } from "../surface";

/**
 * Creates the interaction surface state for an SVG page-stack render result.
 *
 * @param surfaceState - Provisional render-pass surface state.
 * @param documentRect - Document rectangle produced by layout.
 * @returns Surface state whose coordinate projection covers the document.
 */
export function createSvgPageStackDocumentSurfaceState(
  surfaceState: SvgMountedRenderSurfaceState,
  documentRect: QuireRect
): SvgMountedRenderSurfaceState {
  return {
    ...surfaceState,
    displaySize: {
      width: documentRect.width,
      height: documentRect.height
    },
    viewportRect: documentRect,
    surfaceBounds: documentRect
  };
}

/**
 * Adapts an SVG page-stack render result to document-space surface coordinates.
 *
 * @param renderResult - Render result produced from the provisional surface state.
 * @returns Render result adjusted for SVG page-stack interaction coordinates.
 */
export function adaptSvgPageStackDocumentCoordinates(
  renderResult: QuireViewRenderResult
): QuireViewRenderResult {
  const { documentRect } = renderResult.layoutSnapshot;
  return {
    ...withMountedRenderResultBounds(renderResult, documentRect),
    layoutSnapshot: {
      ...renderResult.layoutSnapshot,
      viewportRect: documentRect
    },
    interactionSnapshot: {
      ...renderResult.interactionSnapshot,
      viewportRect: documentRect
    }
  };
}
