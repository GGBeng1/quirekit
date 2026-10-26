import type { QuireRect } from "@quirekit/renderer";
import type { QuirePageGeometry, QuireResolvedPageGeometry } from "./types";

/**
 * Resolves a page geometry template for one page index.
 *
 * @param pageGeometry - Geometry template for the first page.
 * @param pageIndex - Zero-based page index to resolve.
 * @returns Page and body rectangles translated into document layout space.
 */
export function resolveQuirePageGeometryForIndex(
  pageGeometry: QuirePageGeometry,
  pageIndex: number
): QuireResolvedPageGeometry {
  const yOffset =
    Math.max(0, pageIndex) * (pageGeometry.pageRect.height + (pageGeometry.pageGap ?? 0));
  const bodyRect = narrowQuireFirstPageBody(
    translateQuireRect(resolveQuirePageBodyRect(pageGeometry, pageIndex), yOffset),
    pageIndex === 0 ? pageGeometry.firstPageBodyTop : undefined,
    pageIndex === 0 ? pageGeometry.firstPageBodyBottom : undefined
  );
  const columns = pageGeometry.columns?.columns;

  return {
    pageRect: translateQuireRect(pageGeometry.pageRect, yOffset),
    bodyRect,
    ...(columns === undefined || columns.length < 2
      ? {}
      : {
          columnRects: columns.map((column) => ({
            x: bodyRect.x + column.offset,
            y: bodyRect.y,
            width: column.width,
            height: bodyRect.height
          }))
        })
  };
}

/**
 * Selects the first-page-coordinate body rectangle for one physical page.
 *
 * @param pageGeometry - Clone-safe page geometry template.
 * @param pageIndex - Zero-based physical page index.
 * @returns Selected body rectangle before document-space translation.
 */
function resolveQuirePageBodyRect(
  pageGeometry: QuirePageGeometry,
  pageIndex: number
): QuireRect {
  const variants = pageGeometry.bodyRectVariants;
  if (variants === undefined) {
    return pageGeometry.bodyRect;
  }
  if (pageIndex <= 0) {
    return variants.first ?? variants.odd ?? pageGeometry.bodyRect;
  }
  if (pageIndex % 2 === 1) {
    return variants.even ?? pageGeometry.bodyRect;
  }
  return variants.odd ?? pageGeometry.bodyRect;
}

/**
 * Narrows the first page's body to the band left free by content already on the page.
 *
 * @param bodyRect - Resolved body rectangle.
 * @param top - Document-space body top, or undefined to keep the top.
 * @param bottomEdge - Document-space body bottom, or undefined to keep the bottom.
 * @returns Body rectangle never extending beyond its original edges.
 */
function narrowQuireFirstPageBody(
  bodyRect: QuireRect,
  top: number | undefined,
  bottomEdge: number | undefined
): QuireRect {
  const originalBottom = bodyRect.y + bodyRect.height;
  const bottom = bottomEdge === undefined ? originalBottom : Math.min(originalBottom, bottomEdge);
  const y = top === undefined ? bodyRect.y : Math.min(Math.max(top, bodyRect.y), bottom);
  return y === bodyRect.y && bottom === originalBottom ? bodyRect : { ...bodyRect, y, height: Math.max(0, bottom - y) };
}

/**
 * Translates a rectangle vertically.
 *
 * @param rect - Rectangle to translate.
 * @param yOffset - Vertical offset in CSS pixels.
 * @returns Translated rectangle.
 */
function translateQuireRect(rect: QuireRect, yOffset: number): QuireRect {
  return {
    x: rect.x,
    y: rect.y + yOffset,
    width: rect.width,
    height: rect.height
  };
}
