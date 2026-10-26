import type { QuireRect } from "@quirekit/renderer";
import type { QuireViewBuildOptions } from "../../types";
import { resolveQuirePageStackRenderClipRects } from "../page-stack";
import { createMountedFrameBuildOptions } from "../render-result/build-options/runtime";
import type { MountedFrameRuntimeOptions } from "../render-result/build-options/types";
import type { MountedPaginatedLayoutRequest, MountedPaginatedLayoutWindow } from "./types";

/**
 * Reads current paginated inputs without changing the fill controller.
 * @param runtime - Current backend measurement and style policies.
 * @param viewportRect - Current backend layout viewport in document coordinates.
 * @param presentation - Current page and visible-region authority.
 * @param request - Exact update facts, including a full-render fill window when present.
 * @param bufferPages - Backend's neighbouring-page buffer.
 * @param displayListTransform - Current framework or consumer paint transform.
 * @returns Full-build inputs, or no proof before a paginated surface exists.
 */
export function createMountedPaginatedBuildOptions(
  runtime: MountedFrameRuntimeOptions,
  viewportRect: QuireRect,
  presentation: MountedPaginatedLayoutWindow | undefined,
  request: MountedPaginatedLayoutRequest,
  bufferPages = 1,
  displayListTransform?: QuireViewBuildOptions["displayListTransform"]
): QuireViewBuildOptions | undefined {
  if (presentation === undefined) return undefined;
  const pageRects = presentation.getPageRects();
  const clipRects = resolveQuirePageStackRenderClipRects({
    reason: request.reason,
    pageRects,
    visiblePageIndices: presentation.resolveVisiblePageIndices(pageRects, bufferPages),
    visibleRegion: presentation.getVisibleRegion(),
    pageGeometry: runtime.pageGeometry,
    bufferPages
  });
  // An overlay-only request has no fill window, so only previously unbounded
  // geometry can qualify. Bounded snapshots go through the regular fill owner.
  return createMountedFrameBuildOptions({
    viewportRect,
    imePreedit: request.imePreedit,
    updatePatch: request.updatePatch,
    layoutDirtyRange: request.layoutDirtyRange,
    maxBlocks: request.fillWindow?.maxBlocks,
    maxShapedBlockExtent: request.fillWindow?.maxShapedBlockExtent,
    layoutSnapshotClipRects: clipRects,
    displayListClipRects: clipRects,
    requirePageDisplayListChunks: true,
    displayListTransform
  }, runtime);
}
