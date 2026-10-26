import type { QuirePageColumnFragment, QuirePageFragment } from "@quirekit/layout/pagination";
import type { QuireLayoutBox } from "../../../types";
import {
  doesQuireRectIntersectAny,
  type QuireRect
} from "@quirekit/renderer";
import { resolveQuirePageRepeatedHeaderHeight } from "../repeated-header/reservation";
import { hasQuirePageMeasuredSourceFlowBand } from "../source-flow";
import type { QuirePageBodyProjection } from "../types";

/**
 * Creates page-body projections from measured source-flow page bands.
 *
 * @param boxes - Top-level layout boxes in infinite-flow coordinates.
 * @param pages - Page fragments derived from those boxes.
 * @param sourceX - Horizontal origin of the source flow before page projection.
 * @param clipRects - Optional document-space rectangles limiting page projection work.
 * @returns Page projections that can move owned flow geometry into page bodies.
 */
export function createQuirePageBodyProjections(
  boxes: readonly QuireLayoutBox[],
  pages: readonly QuirePageFragment[],
  sourceX: number,
  clipRects?: readonly QuireRect[] | undefined
): readonly QuirePageBodyProjection[] {
  const projections: QuirePageBodyProjection[] = [];

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index]!;

    if (clipRects !== undefined && !doesQuirePageIntersectAnyClip(page, clipRects)) {
      continue;
    }

    const pageProjections = createQuirePageBodyProjection(boxes, page, sourceX);

    for (
      let projectionIndex = 0;
      projectionIndex < pageProjections.length;
      projectionIndex += 1
    ) {
      projections.push(pageProjections[projectionIndex]!);
    }
  }

  return projections;
}

/**
 * Checks whether a page participates in the active projection clip.
 *
 * @param page - Page fragment to test.
 * @param clipRects - Active document-space clip rectangles.
 * @returns Whether the page intersects at least one clip rectangle.
 */
function doesQuirePageIntersectAnyClip(
  page: QuirePageFragment,
  clipRects: readonly QuireRect[]
): boolean {
  return doesQuireRectIntersectAny(page.pageRect, clipRects);
}

/**
 * Creates a page-body projection for one page fragment.
 *
 * @param boxes - Top-level layout boxes in infinite-flow coordinates.
 * @param page - Page fragment to anchor.
 * @param sourceX - Horizontal origin of the source flow before page projection.
 * @returns Projection for the page, or an empty list when the page cannot be anchored.
 */
function createQuirePageBodyProjection(
  boxes: readonly QuireLayoutBox[],
  page: QuirePageFragment,
  sourceX: number
): readonly QuirePageBodyProjection[] {
  if (page.columns !== undefined) {
    const projections: QuirePageBodyProjection[] = [];
    for (const column of page.columns) {
      const projection = createQuireMeasuredSourceFlowProjection(
        boxes,
        createQuirePageColumnView(page, column),
        sourceX
      );
      if (projection !== null) {
        projections.push({ ...projection, columnIndex: column.columnIndex, marginRect: page.bodyRect });
      }
    }
    return projections;
  }

  const sourceFlowProjection = createQuireMeasuredSourceFlowProjection(
    boxes,
    page,
    sourceX
  );

  return sourceFlowProjection === null ? [] : [sourceFlowProjection];
}

/**
 * Narrows a multi-column page to one column so downstream projection stays column-agnostic.
 *
 * @param page - Physical page fragment carrying columns.
 * @param column - Column to expose.
 * @returns Page fragment whose range, body and source-flow band describe the column.
 */
function createQuirePageColumnView(
  page: QuirePageFragment,
  column: QuirePageColumnFragment
): QuirePageFragment {
  return {
    pageIndex: page.pageIndex,
    pageRect: page.pageRect,
    range: column.range,
    bodyRect: column.bodyRect,
    rect: column.rect,
    // Each column starts with its own leading band; the page's end info describes only the last column.
    endInfo: column.endInfo ?? page.endInfo,
    ...(column.sourceFlowY === undefined ? {} : { sourceFlowY: column.sourceFlowY }),
    ...(column.sourceFlowHeight === undefined ? {} : { sourceFlowHeight: column.sourceFlowHeight }),
    ...(column.sourceFragments === undefined ? {} : { sourceFragments: column.sourceFragments })
  };
}

/**
 * Creates a page projection from measured source-flow coordinates when available.
 *
 * @param boxes - Top-level layout boxes in infinite-flow coordinates.
 * @param page - Page fragment to anchor.
 * @param sourceX - Horizontal origin of the source flow before page projection.
 * @returns Projection anchored by measured source flow, or null when unavailable.
 */
function createQuireMeasuredSourceFlowProjection(
  boxes: readonly QuireLayoutBox[],
  page: QuirePageFragment,
  sourceX: number
): QuirePageBodyProjection | null {
  if (!hasQuirePageMeasuredSourceFlowBand(page)) {
    return null;
  }

  return {
    page,
    dx: page.bodyRect.x - sourceX,
    dy: page.bodyRect.y +
      resolveQuirePageRepeatedHeaderHeight(boxes, page) -
      page.sourceFlowY
  };
}
