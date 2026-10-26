import {
  refreshQuireLayoutSnapshotLayerTargetIndex,
  type QuireLayoutPage
} from "@quirekit/view-engine";

import type { QuireViewRenderResult } from "../../types";

/**
 * Realizes renderer-neutral document facts required by a mounted page stack.
 *
 * This phase runs after layout and retained display-owner compilation. It makes
 * page identity explicit for both layout and interaction consumers, then
 * rebuilds interaction buckets from that final page list. Backend coordinate
 * adaptation, surface realization, clipping, and paint remain downstream.
 *
 * @param renderResult - Complete retained render result produced by the view facade.
 * @returns Render result with explicit pages and canonical page-local chunks.
 */
export function realizeMountedPaginatedDocument(
  renderResult: QuireViewRenderResult
): QuireViewRenderResult {
  const pageDisplayListChunks = renderResult.pageDisplayListChunks;
  if (pageDisplayListChunks === undefined) {
    throw new RangeError(
      "Mounted paginated document realization requires pageDisplayListChunks."
    );
  }

  const pages = renderResult.layoutSnapshot.pages?.length
    ? renderResult.layoutSnapshot.pages
    : [createMountedPaginatedDocumentPage(renderResult)];

  return {
    ...renderResult,
    layoutSnapshot: {
      ...renderResult.layoutSnapshot,
      pages
    },
    interactionSnapshot: refreshQuireLayoutSnapshotLayerTargetIndex(
      {
        ...renderResult.interactionSnapshot,
        pages
      },
      pages
    ),
    pageDisplayListChunks
  };
}

/**
 * Creates the explicit page used when a mounted page stack consumes continuous layout.
 *
 * @param renderResult - Render result whose root range and document box define page zero.
 * @returns Single page covering the complete unpaginated document.
 */
function createMountedPaginatedDocumentPage(
  renderResult: QuireViewRenderResult
): QuireLayoutPage {
  const pageRect = renderResult.layoutSnapshot.documentRect;

  return {
    pageIndex: 0,
    range: renderResult.layoutSnapshot.root.range,
    pageRect,
    bodyRect: pageRect
  };
}
