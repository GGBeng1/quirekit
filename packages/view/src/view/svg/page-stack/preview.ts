import type { QuireDrawingManipulatingState } from "@quirekit/view-engine";
import type { QuireRect } from "@quirekit/renderer";
import type { QuireViewRenderResult } from "../../types";
import {
  createMountedDrawingLayoutPreviewPatch,
  realizeMountedPaginatedDocument
} from "../../shared";
import {
  resolveSvgMountedPageStackSurfaceState,
  type SvgMountedRenderSurfaceState
} from "../surface";
import { runSvgMountedRenderPass, type RunSvgMountedRenderPassOptions } from "../render-pass";
import { adaptSvgPageStackDocumentCoordinates } from "./coordinates";
import { buildDrawingPreviewCoverage } from "../../shared/paginated-facade/preview-coverage";

/** Options used to build one SVG drawing layout preview. */
export interface BuildSvgMountedDrawingLayoutPreviewOptions extends Omit<RunSvgMountedRenderPassOptions, "surfaceState"> {
  /** Current mounted page rectangles, which may differ from the gesture's accepted chunks. */
  readonly mountedPageRects?: readonly QuireRect[] | undefined;
  /** Queries the presentation's buffered viewport against speculative page geometry. */
  readonly resolveVisiblePageIndices: (rects: readonly QuireRect[]) => readonly number[];
  /** Current document-space SVG surface state, if any. */
  readonly surfaceState: SvgMountedRenderSurfaceState | undefined;
  /** Active manipulation frame to measure speculatively. */
  readonly state: QuireDrawingManipulatingState;
  /** Stable result captured before the gesture began. */
  readonly acceptedRenderResult: QuireViewRenderResult;
}

/**
 * Builds one isolated full-layout drawing preview for mounted SVG pages.
 *
 * @param options - View, runtime, current surface, and manipulation state.
 * @returns Speculative page-stack result, or undefined when ownership is stale.
 */
export function buildSvgMountedDrawingLayoutPreview(
  options: BuildSvgMountedDrawingLayoutPreviewOptions
): QuireViewRenderResult | undefined {
  const { surfaceState: acceptedSurface, acceptedRenderResult, state,
    mountedPageRects, resolveVisiblePageIndices, ...renderOptions } = options;
  if (acceptedSurface === undefined) {
    return undefined;
  }
  const transientNodeLayoutPatch = createMountedDrawingLayoutPreviewPatch(
    acceptedRenderResult,
    state
  );
  if (transientNodeLayoutPatch === undefined) {
    return undefined;
  }
  const surfaceState = resolveSvgMountedPageStackSurfaceState(options.runtime);
  return buildDrawingPreviewCoverage(mountedPageRects, currentClipRects => {
    const renderResult = runSvgMountedRenderPass({
      ...renderOptions,
      surfaceState,
      transientNodeLayoutPatch,
      ...(currentClipRects === undefined ? {} : { displayListClipRects: currentClipRects }),
      ...(currentClipRects === undefined ? {} : { layoutSnapshotClipRects: currentClipRects }),
      requirePageDisplayListChunks: true
    });
    return adaptSvgPageStackDocumentCoordinates(
      realizeMountedPaginatedDocument(renderResult)
    );
  }, resolveVisiblePageIndices);
}
