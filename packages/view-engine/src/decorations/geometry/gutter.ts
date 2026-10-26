import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import type {
  QuireDecorationGutterVisual,
  QuireDecorationGutterMarkerSide,
  QuireDecorationRectVisual
} from "../types";

/** Page geometry used while resolving page-side annotation markers. */
interface QuireDecorationGutterPage {
  /** Zero-based page index. */
  readonly pageIndex: number;
  /** Complete page bounds in document-space coordinates. */
  readonly pageRect: QuireRect;
  /** Page body bounds whose selected edge anchors the gutter. */
  readonly bodyRect: QuireRect;
}

/** Mutable coalescing record for one logical owner on one page. */
interface QuireDecorationGutterAccumulator {
  /** Stable source decoration identity. */
  decorationId: string;
  /** Stable semantic annotation owner. */
  ownerId: string;
  /** Earliest represented document position. */
  from: number;
  /** Latest represented document position. */
  to: number;
  /** Marker x coordinate. */
  x: number;
  /** Marker top coordinate. */
  top: number;
  /** Marker bottom coordinate. */
  bottom: number;
  /** Stroke and token color. */
  color: string;
  /** Stroke width. */
  lineWidth: number;
  /** Page-body side that owns the marker. */
  side: QuireDecorationGutterMarkerSide;
  /** Author-token size. */
  tokenSize: number;
  /** Zero-based page index. */
  pageIndex: number;
}

/**
 * Resolves logical inline gutter requests against final page geometry.
 *
 * One logical owner is coalesced independently per page. The result remains a
 * paint-only derivative of laid-out rectangles and therefore cannot influence
 * shaping, line breaking, pagination, or selection geometry.
 *
 * @param snapshot - Layout snapshot that owns pages and document geometry.
 * @param visuals - Exact inline visuals carrying optional gutter requests.
 * @returns Deterministic page-resolved gutter marker visuals.
 */
export function resolveQuireDecorationGutterMarkers(
  snapshot: QuireLayoutSnapshot,
  visuals: readonly QuireDecorationRectVisual[]
): readonly QuireDecorationGutterVisual[] {
  const pages = resolveGutterPages(snapshot);
  const accumulators = new Map<string, QuireDecorationGutterAccumulator>();

  for (const visual of visuals) {
    const request = visual.gutterMarker;
    if (request === undefined) continue;

    for (const page of pages) {
      const intersection = intersectVerticalExtent(visual.rect, page.pageRect);
      if (intersection === null) continue;
      const x = resolveGutterMarkerX(
        page,
        request.side,
        request.offset,
        request.width
      );
      const key = createGutterAccumulatorKey(
        request.ownerId,
        page.pageIndex,
        request.color,
        request.width,
        request.side,
        request.offset,
        request.tokenSize
      );
      const current = accumulators.get(key);
      if (current === undefined) {
        accumulators.set(key, {
          decorationId: visual.decorationId,
          ownerId: request.ownerId,
          from: visual.range.from,
          to: visual.range.to,
          x,
          top: intersection.top,
          bottom: intersection.bottom,
          color: request.color,
          lineWidth: request.width,
          side: request.side,
          tokenSize: request.tokenSize,
          pageIndex: page.pageIndex
        });
        continue;
      }

      current.from = Math.min(current.from, visual.range.from);
      current.to = Math.max(current.to, visual.range.to);
      current.top = Math.min(current.top, intersection.top);
      current.bottom = Math.max(current.bottom, intersection.bottom);
    }
  }

  return [...accumulators.values()]
    .sort((left, right) => left.pageIndex - right.pageIndex
      || left.top - right.top
      || left.ownerId.localeCompare(right.ownerId))
    .map(createGutterVisual);
}

/**
 * Resolves authored pages or one explicit continuous-layout fallback page.
 *
 * @param snapshot - Layout snapshot carrying page and document bounds.
 * @returns Non-empty page geometry list.
 */
function resolveGutterPages(
  snapshot: QuireLayoutSnapshot
): readonly QuireDecorationGutterPage[] {
  if (snapshot.pages !== undefined && snapshot.pages.length > 0) {
    return snapshot.pages;
  }
  return [{
    pageIndex: 0,
    pageRect: snapshot.documentRect,
    bodyRect: snapshot.documentRect
  }];
}

/**
 * Intersects one inline visual with a page's vertical paint extent.
 *
 * @param visual - Inline visual rectangle.
 * @param page - Complete page rectangle.
 * @returns Positive vertical extent or null when the visual is off-page.
 */
function intersectVerticalExtent(
  visual: QuireRect,
  page: QuireRect
): { readonly top: number; readonly bottom: number } | null {
  const top = Math.max(visual.y, page.y);
  const bottom = Math.min(visual.y + visual.height, page.y + page.height);
  return bottom > top ? { top, bottom } : null;
}

/**
 * Resolves a clamped page-body-side gutter x coordinate.
 *
 * @param page - Page and body bounds.
 * @param side - Physical page-body side that owns the marker.
 * @param offset - Requested outward distance from the selected body edge.
 * @param width - Marker stroke width.
 * @returns Marker center x retained inside the page bounds.
 */
function resolveGutterMarkerX(
  page: QuireDecorationGutterPage,
  side: QuireDecorationGutterMarkerSide,
  offset: number,
  width: number
): number {
  const halfWidth = width / 2;
  const desired = side === "start"
    ? page.bodyRect.x - offset
    : page.bodyRect.x + page.bodyRect.width + offset;
  const minimum = page.pageRect.x + halfWidth;
  const maximum = page.pageRect.x + page.pageRect.width - halfWidth;
  return Math.max(minimum, Math.min(maximum, desired));
}

/**
 * Creates a collision-safe coalescing key.
 *
 * @param ownerId - Logical annotation owner.
 * @param pageIndex - Page containing the visual.
 * @param color - Marker color.
 * @param width - Marker width.
 * @param side - Physical page-body side.
 * @param offset - Body-edge offset.
 * @param tokenSize - Author-token size.
 * @returns Stable grouping key.
 */
function createGutterAccumulatorKey(
  ownerId: string,
  pageIndex: number,
  color: string,
  width: number,
  side: QuireDecorationGutterMarkerSide,
  offset: number,
  tokenSize: number
): string {
  return JSON.stringify([
    ownerId,
    pageIndex,
    color,
    width,
    side,
    offset,
    tokenSize
  ]);
}

/**
 * Freezes one accumulated marker into the public visual contract.
 *
 * @param accumulator - Mutable page-local marker aggregate.
 * @returns Renderer-neutral gutter visual.
 */
function createGutterVisual(
  accumulator: QuireDecorationGutterAccumulator
): QuireDecorationGutterVisual {
  return {
    id: `decoration-gutter:${encodeURIComponent(
      accumulator.ownerId
    )}:${accumulator.side}:page-${accumulator.pageIndex}`,
    decorationId: accumulator.decorationId,
    ownerId: accumulator.ownerId,
    range: { from: accumulator.from, to: accumulator.to },
    rect: {
      x: accumulator.x - accumulator.lineWidth / 2,
      y: accumulator.top,
      width: accumulator.lineWidth,
      height: Math.max(1, accumulator.bottom - accumulator.top)
    },
    color: accumulator.color,
    lineWidth: accumulator.lineWidth,
    side: accumulator.side,
    tokenSize: accumulator.tokenSize,
    pageIndex: accumulator.pageIndex
  };
}
