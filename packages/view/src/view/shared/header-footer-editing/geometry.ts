import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutPage } from "@quirekit/view-engine";
import type {
  MountedHeaderFooterEditingChromeGeometry,
  MountedHeaderFooterEditingRegion
} from "./types";

/**
 * Resolves page-clipped active and inactive mode rectangles.
 *
 * @param region - Header or footer editing region.
 * @param referenceRect - Exact retained story hit used to find its page.
 * @param pages - Current paginated layout geometry.
 * @returns Page-derived chrome geometry, or the exact hit as a safe fallback.
 */
export function resolveHeaderFooterEditingChromeGeometry(
  region: MountedHeaderFooterEditingRegion,
  referenceRect: QuireRect | undefined,
  pages: readonly QuireLayoutPage[]
): MountedHeaderFooterEditingChromeGeometry {
  const fallback = referenceRect ?? { x: 0, y: 0, width: 0, height: 0 };
  const page = referenceRect === undefined
    ? undefined
    : pages.find((candidate) => containsRectCenter(candidate.pageRect, referenceRect));
  if (page === undefined) {
    return { activeRect: fallback };
  }

  const pageBottom = page.pageRect.y + page.pageRect.height;
  const bodyTop = clamp(page.bodyRect.y, page.pageRect.y, pageBottom);
  const bodyBottom = clamp(
    page.bodyRect.y + page.bodyRect.height,
    page.pageRect.y,
    pageBottom
  );
  const boundary = region === "header" ? bodyTop : bodyBottom;
  const activeRect = region === "header"
    ? {
        x: page.pageRect.x,
        y: page.pageRect.y,
        width: page.pageRect.width,
        height: boundary - page.pageRect.y
      }
    : {
        x: page.pageRect.x,
        y: boundary,
        width: page.pageRect.width,
        height: pageBottom - boundary
      };
  const inactiveRect = region === "header"
    ? {
        x: page.pageRect.x,
        y: boundary,
        width: page.pageRect.width,
        height: pageBottom - boundary
      }
    : {
        x: page.pageRect.x,
        y: page.pageRect.y,
        width: page.pageRect.width,
        height: boundary - page.pageRect.y
      };

  // Each region is drawn as one body-facing boundary spanning the measured
  // body width, so chrome stays subordinate to pagination and never stacks a
  // second dashed frame inside the page.
  const headerBoundaryRect = {
    x: page.bodyRect.x,
    y: bodyTop,
    width: page.bodyRect.width,
    height: 0
  };
  const footerBoundaryRect = {
    x: page.bodyRect.x,
    y: bodyBottom,
    width: page.bodyRect.width,
    height: 0
  };

  return {
    pageRect: page.pageRect,
    bodyRect: page.bodyRect,
    activeRect,
    inactiveRect,
    headerBoundaryRect,
    footerBoundaryRect
  };
}

/**
 * Checks whether one reference rectangle is centered inside a page.
 *
 * @param pageRect - Candidate page rectangle.
 * @param referenceRect - Retained story hit rectangle.
 * @returns Whether the reference center belongs to the page.
 */
function containsRectCenter(pageRect: QuireRect, referenceRect: QuireRect): boolean {
  const x = referenceRect.x + referenceRect.width / 2;
  const y = referenceRect.y + referenceRect.height / 2;
  return x >= pageRect.x
    && x <= pageRect.x + pageRect.width
    && y >= pageRect.y
    && y <= pageRect.y + pageRect.height;
}

/**
 * Clamps a number to an inclusive range.
 *
 * @param value - Number to clamp.
 * @param minimum - Inclusive lower bound.
 * @param maximum - Inclusive upper bound.
 * @returns Clamped number.
 */
function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
