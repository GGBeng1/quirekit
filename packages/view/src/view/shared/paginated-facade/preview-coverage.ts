import type { QuireRect } from "@quirekit/renderer";
import type { QuireViewRenderResult } from "../../types";

/**
 * Builds bounded preview products, expanding coverage once if reflow adds visible pages.
 * @param mountedRects - Previous mounted page window, not assumed to match speculative pagination.
 * @param build - Isolated transient compiler; never commits document state or accepted caches.
 * @param visible - Presentation-owned buffered page query for the newly laid-out page geometry.
 * @returns Speculative products covering every page the presentation will mount.
 */
export function buildDrawingPreviewCoverage(
  mountedRects: readonly QuireRect[] | undefined,
  build: (rects: readonly QuireRect[] | undefined) => QuireViewRenderResult,
  visible: (rects: readonly QuireRect[]) => readonly number[]
): QuireViewRenderResult {
  const result = build(mountedRects);
  const pages = result.layoutSnapshot.pages ?? [];
  const indices = visible(pages.map(page => page.pageRect));
  const covered = new Set(result.pageDisplayListChunks?.chunks.map(chunk => chunk.pageIndex));
  if (indices.every(index => covered.has(index))) return result;
  // Pagination is complete before clip projection. Reusing those page rectangles
  // changes only retained coverage, not geometry, so at most one retry is needed.
  return build(indices.map(index => pages[index]!.pageRect));
}
