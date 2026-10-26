import type { QuireLayoutPage } from "@quirekit/view-engine";
import type { QuirePoint } from "@quirekit/renderer";

const bodyEdgeInset = 0.5;

/** Inputs used to project a pointer from page chrome into a body edge. */
interface ResolveMountedBodyPageEdgeProjectionOptions {
  /** Retained pages owning page and body rectangles. */
  readonly pages: readonly QuireLayoutPage[];
  /** Original document-space pointer point. */
  readonly point: QuirePoint;
}

/** Page and projected point selected for a body-edge query. */
export interface MountedBodyPageEdgeProjection {
  /** Page whose visible body owns the projected endpoint. */
  readonly page: QuireLayoutPage;
  /** Point projected just inside the selected page body edge. */
  readonly point: QuirePoint;
}

/**
 * Projects page header, footer, and gap points just inside the nearest body edge.
 *
 * A point already sharing a page body's vertical band remains ordinary body
 * interaction, including horizontal page-margin blanks on that band.
 *
 * @param options - Retained page rectangles and original document-space point.
 * @returns Projected body-edge point, or null when the point is already in a body band.
 */
export function resolveMountedBodyPageEdgeProjection(
  options: ResolveMountedBodyPageEdgeProjectionOptions
): QuirePoint | null {
  return resolveMountedBodyPageEdgeProjectionContext(options)?.point ?? null;
}

/**
 * Resolves the page and point owning one page-chrome projection.
 *
 * @param options - Retained page rectangles and original document-space point.
 * @param forcedEdge - Optional semantic edge required by an auxiliary-story hit.
 * @returns Page-local projection, or null for an ordinary hit inside a body band.
 */
export function resolveMountedBodyPageEdgeProjectionContext(
  options: ResolveMountedBodyPageEdgeProjectionOptions,
  forcedEdge?: "start" | "end" | undefined
): MountedBodyPageEdgeProjection | null {
  if (options.pages.length === 0) {
    return null;
  }

  const bodyPage = options.pages.find((page) =>
    containsVerticalPoint(page.bodyRect, options.point.y)
  );
  if (bodyPage !== undefined && forcedEdge === undefined) {
    return null;
  }

  const page = bodyPage
    ?? findPageOwningChromePoint(options.pages, options.point.y);
  const bodyTop = page.bodyRect.y;
  const bodyBottom = bodyTop + page.bodyRect.height;
  const edge = forcedEdge
    ?? (options.point.y < bodyTop ? "start" : "end");

  return {
    page,
    point: {
      x: clampInsideRectAxis(
        options.point.x,
        page.bodyRect.x,
        page.bodyRect.width
      ),
      y: edge === "start"
        ? insetRectAxisStart(bodyTop, page.bodyRect.height)
        : insetRectAxisEnd(bodyBottom, page.bodyRect.height)
    }
  };
}

/**
 * Checks whether one coordinate belongs to a rectangle's vertical band.
 *
 * @param rect - Rectangle providing a vertical start and extent.
 * @param y - Document-space vertical coordinate.
 * @returns Whether the coordinate lies on or between both vertical edges.
 */
export function containsMountedBodyPageVerticalPoint(
  rect: { readonly y: number; readonly height: number },
  y: number
): boolean {
  return containsVerticalPoint(rect, y);
}

/**
 * Finds the page whose chrome owns a point outside all body rectangles.
 *
 * Inter-page gaps remain attached to the preceding page until the pointer
 * enters the following page rectangle. This prevents a gap from prematurely
 * advancing selection into the next page header.
 *
 * @param pages - Retained pages in visual order.
 * @param y - Document-space vertical pointer coordinate.
 * @returns Page whose body edge should receive the projected point.
 */
function findPageOwningChromePoint(
  pages: readonly QuireLayoutPage[],
  y: number
): QuireLayoutPage {
  for (const page of pages) {
    if (containsVerticalPoint(page.pageRect, y)) {
      return page;
    }
  }

  let precedingPage: QuireLayoutPage | undefined;
  for (const page of pages) {
    if (page.pageRect.y > y) {
      return precedingPage ?? page;
    }
    precedingPage = page;
  }

  return precedingPage ?? pages[0]!;
}

/**
 * Checks whether one coordinate belongs to a rectangle's vertical band.
 *
 * @param rect - Rectangle providing a vertical start and extent.
 * @param y - Document-space vertical coordinate.
 * @returns Whether the coordinate lies on or between both vertical edges.
 */
function containsVerticalPoint(
  rect: { readonly y: number; readonly height: number },
  y: number
): boolean {
  return y >= rect.y && y <= rect.y + rect.height;
}

/**
 * Clamps one coordinate just inside a rectangle axis.
 *
 * @param value - Coordinate to clamp.
 * @param start - Rectangle axis start.
 * @param size - Rectangle axis size.
 * @returns Coordinate no closer to either edge than the safe inset.
 */
function clampInsideRectAxis(value: number, start: number, size: number): number {
  const min = insetRectAxisStart(start, size);
  const max = insetRectAxisEnd(start + size, size);
  return Math.min(max, Math.max(min, value));
}

/**
 * Resolves an inset coordinate at the start of a rectangle axis.
 *
 * @param start - Rectangle axis start.
 * @param size - Rectangle axis size.
 * @returns Coordinate just inside the start edge.
 */
function insetRectAxisStart(start: number, size: number): number {
  return start + Math.min(bodyEdgeInset, Math.max(0, size / 2));
}

/**
 * Resolves an inset coordinate at the end of a rectangle axis.
 *
 * @param end - Rectangle axis end.
 * @param size - Rectangle axis size.
 * @returns Coordinate just inside the end edge.
 */
function insetRectAxisEnd(end: number, size: number): number {
  return end - Math.min(bodyEdgeInset, Math.max(0, size / 2));
}
