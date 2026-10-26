import type { QuireRect } from "@quirekit/renderer";
import {
  applyFullOverlayStyle,
  applyHeaderFooterInactiveMaskStyle,
  applyRectStyle,
  createHeaderFooterBoundaryGuide,
  createHeaderFooterRegionTag,
  positionHeaderFooterActionGroup
} from "./chrome-elements";
import { resolveHeaderFooterEditingChromeGeometry } from "./geometry";
import type {
  CreateMountedHeaderFooterEditingChromeOptions,
  MountedHeaderFooterEditingChrome
} from "./types";

/**
 * Creates additive mode chrome without mutating layout or document state.
 *
 * @param options - Owner document, active region, retained band, and action host.
 * @returns Transient chrome nodes ready to mount in the overlay host.
 */
export function createMountedHeaderFooterEditingChrome(
  options: CreateMountedHeaderFooterEditingChromeOptions
): MountedHeaderFooterEditingChrome {
  const element = options.ownerDocument.createElement("div");
  const band = options.ownerDocument.createElement("div");
  const geometry = resolveHeaderFooterEditingChromeGeometry(
    options.region,
    options.referenceRect,
    options.pages
  );
  const rect = geometry.activeRect;

  element.dataset.qkHeaderFooterChrome = options.region;
  applyFullOverlayStyle(element);
  if (geometry.inactiveRect !== undefined) {
    const inactiveMask = options.ownerDocument.createElement("div");
    inactiveMask.dataset.qkHeaderFooterInactive = options.region;
    applyRectStyle(inactiveMask, insetFromPageEdges(options.region, geometry.inactiveRect));
    applyHeaderFooterInactiveMaskStyle(inactiveMask);
    element.append(inactiveMask);
  }

  band.dataset.qkHeaderFooterBand = options.region;
  band.style.position = "absolute";
  band.style.boxSizing = "border-box";
  band.style.pointerEvents = "none";
  applyRectStyle(band, rect);
  element.append(band);

  // Boundaries first, then the tag that belongs to the active one, so the tag
  // paints above both lines.
  const activeBoundaryRect = (options.region === "header"
    ? geometry.headerBoundaryRect
    : geometry.footerBoundaryRect) ?? resolveFallbackBoundaryRect(options.region, rect);
  for (const region of ["header", "footer"] as const) {
    const boundary = region === options.region
      ? activeBoundaryRect
      : region === "header" ? geometry.headerBoundaryRect : geometry.footerBoundaryRect;
    if (boundary !== undefined) {
      element.append(createHeaderFooterBoundaryGuide(
        options.ownerDocument,
        region,
        boundary,
        region === options.region
      ));
    }
  }
  element.append(createHeaderFooterRegionTag(
    options.ownerDocument,
    options.region,
    activeBoundaryRect,
    options.regionLabel
  ));
  positionHeaderFooterActionGroup(options.actions, options.region, activeBoundaryRect);

  return { element, band };
}

/**
 * Keeps the inactive wash one pixel inside the page so its edge stays visible.
 *
 * @param region - Active header or footer region.
 * @param rect - Page-clipped inactive rectangle.
 * @returns Rectangle inset from the page's side and outer edges.
 */
function insetFromPageEdges(
  region: "header" | "footer",
  rect: QuireRect
): QuireRect {
  return {
    x: rect.x + 1,
    y: region === "header" ? rect.y : rect.y + 1,
    width: rect.width - 2,
    height: rect.height - 1
  };
}

/**
 * Resolves the active body-facing boundary when page geometry is unavailable.
 *
 * @param region - Active header or footer region.
 * @param rect - Active region rectangle.
 * @returns Zero-height boundary rectangle.
 */
function resolveFallbackBoundaryRect(
  region: "header" | "footer",
  rect: QuireRect
): QuireRect {
  return {
    x: rect.x,
    y: region === "header" ? rect.y + rect.height : rect.y,
    width: rect.width,
    height: 0
  };
}
