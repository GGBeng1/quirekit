import {
  doesQuireRectIntersectAny,
  isQuireRectEmpty
} from "@quirekit/renderer";
import type { QuireRect } from "@quirekit/renderer";
import type {
  ResolveQuirePageStackRenderClipRectsOptions,
  ShouldRefreshQuirePageStackDisplayListClipOptions
} from "./types";

/**
 * Resolves viewport clip rectangles for page-stack snapshot and display-list builds.
 *
 * Concrete page records are authoritative after pagination. During the initial
 * render, before those records exist, the coordinator's visible document region
 * is expanded by the configured page buffer so first paint does not materialize
 * the entire snapshot merely to discover page identity.
 *
 * @param options - Render reason, page records, and initial viewport evidence.
 * @returns Page rectangles to use as display-list clips, or undefined when unclipped.
 */
export function resolveQuirePageStackRenderClipRects(
  options: ResolveQuirePageStackRenderClipRectsOptions
): readonly QuireRect[] | undefined {
  if (!shouldClipQuirePageStackDisplayList(options.reason)) {
    return undefined;
  }

  if (options.pageRects.length === 0) {
    return resolveInitialRenderClipRects(options);
  }

  const retainedTailPageIndex = options.pageRects.length - 1;
  const clipRects = options.visiblePageIndices.flatMap((pageIndex) => {
    const rect = options.pageRects[pageIndex];
    if (rect === undefined || isQuireRectEmpty(rect)) {
      return [];
    }

    return [pageIndex === retainedTailPageIndex
      ? reserveQuirePageStackTailGrowthClip(options, rect)
      : rect];
  });

  return clipRects.length === 0 ? undefined : clipRects;
}

/**
 * Extends the retained tail clip through the same-pass visible growth window.
 *
 * Page frames synchronize from the new layout snapshot after display commands
 * have already been clipped from the previous snapshot. The old tail can split
 * into enough pages to span the visible region, and sparse mounting also keeps
 * neighbouring pages buffered. The clip must cover both facts before those
 * frames are realized.
 *
 * @param options - Current retained pages and optional canonical page geometry.
 * @param tailRect - Retained last-page rectangle in document space.
 * @returns Tail clip covering the retained page and one speculative successor.
 */
function reserveQuirePageStackTailGrowthClip(
  options: ResolveQuirePageStackRenderClipRectsOptions,
  tailRect: QuireRect
): QuireRect {
  const previousPageRect = options.pageRects.at(-2);
  const inferredPageGap = previousPageRect === undefined
    ? 0
    : Math.max(0, tailRect.y - (previousPageRect.y + previousPageRect.height));
  const pageGap = Math.max(
    0,
    options.pageGeometry?.pageGap ?? inferredPageGap
  );
  const nextPageHeight = Math.max(
    tailRect.height,
    options.pageGeometry?.pageRect.height ?? 0
  );
  const pageStride = nextPageHeight + pageGap;
  const visiblePageSpan = options.visibleRegion === undefined
    ? 1
    : Math.max(1, Math.ceil(options.visibleRegion.height / pageStride));
  const bufferPages = Math.max(0, Math.trunc(options.bufferPages ?? 0));
  const successorCount = Math.max(
    1,
    visiblePageSpan - 1 + bufferPages
  );

  return {
    ...tailRect,
    height: tailRect.height + successorCount * pageStride
  };
}

/**
 * Resolves the initial viewport clip before concrete page records exist.
 * Document-driven page geometry cannot use the provisional viewport as page
 * coverage authority, so it remains unclipped until layout emits page records.
 *
 * @param options - Initial visible region, page geometry, and page buffer.
 * @returns One expanded document-space clip, or undefined without sufficient authority.
 */
function resolveInitialRenderClipRects(
  options: ResolveQuirePageStackRenderClipRectsOptions
): readonly QuireRect[] | undefined {
  if (
    options.reason !== "initial" ||
    options.pageGeometry === undefined ||
    options.visibleRegion === undefined ||
    isQuireRectEmpty(options.visibleRegion)
  ) {
    return undefined;
  }

  const pageStride =
    options.pageGeometry.pageRect.height + (options.pageGeometry.pageGap ?? 0);
  const buffer = Math.max(0, Math.trunc(options.bufferPages ?? 0)) * pageStride;

  return [{
    x: options.visibleRegion.x,
    y: Math.max(0, options.visibleRegion.y - buffer),
    width: options.visibleRegion.width,
    height: options.visibleRegion.height + buffer * 2
  }];
}

/**
 * Checks whether the visible page set has moved outside a clipped render result.
 *
 * @param options - Current page rectangles, visible indices, and retained clips.
 * @returns Whether a full page-stack render must refresh display-list commands.
 */
export function shouldRefreshQuirePageStackDisplayListClip(
  options: ShouldRefreshQuirePageStackDisplayListClipOptions
): boolean {
  const clipRects = options.clipRects;

  if (clipRects === undefined) {
    return false;
  }

  return options.visiblePageIndices.some((pageIndex) => {
    const rect = options.pageRects[pageIndex];
    return rect !== undefined && !doesQuireRectIntersectAny(rect, clipRects);
  });
}

/**
 * Checks whether a page-stack render reason should use visible-page clips.
 *
 * @param reason - Render reason being executed.
 * @returns Whether the display-list build should be clipped to visible pages.
 */
function shouldClipQuirePageStackDisplayList(
  reason: string | undefined
): boolean {
  return (
    reason === "initial" ||
    reason === "scroll" ||
    reason === "image-paint" ||
    reason === "transaction" ||
    reason === "composition" ||
    reason === "fill"
  );
}
