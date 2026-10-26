import type { QuireClientRect } from "@quirekit/view-engine";
import { resolveViewCoordinateAuthority } from "@quirekit/view-engine";
import { findScrollableAncestor } from "../../viewport/scrollable-ancestor";
import type { AncestorScroller } from "../../viewport/types";
import type { ResolveMountedLayoutViewportClientRectOptions } from "../types";

/**
 * Resolves the visible client-space boundary used by active drag selection.
 *
 * @param root - Mounted editor root whose nearest scroll container owns visibility.
 * @returns Visible scroller/client viewport rectangle, or undefined when unavailable.
 */
export function resolveMountedDragBoundaryClientRect(
  root: HTMLElement
): QuireClientRect | undefined {
  const scroller = findScrollableAncestor(root);

  if (!scroller) {
    return undefined;
  }

  if (isElementScroller(scroller)) {
    const element = scroller as HTMLElement;
    const rect = element.getBoundingClientRect();

    return {
      left: rect.left,
      top: rect.top,
      width: element.clientWidth || rect.width || 0,
      height: element.clientHeight || rect.height || 0
    };
  }

  return {
    left: 0,
    top: 0,
    width: scroller.innerWidth || 0,
    height: scroller.innerHeight || 0
  };
}

/**
 * Resolves the layout viewport rectangle into browser client coordinates.
 *
 * @param options - Surface projection and document-space layout viewport.
 * @returns Layout viewport rectangle in client coordinates.
 */
export function resolveMountedLayoutViewportClientRect(
  options: ResolveMountedLayoutViewportClientRectOptions
): QuireClientRect {
  const clientRect = resolveViewCoordinateAuthority(
    options.surfaceClientRect,
    options.surfaceBounds
  ).clientRectFromDocument(options.viewportRect);

  return {
    left: clientRect.left,
    top: clientRect.top,
    width: clientRect.right - clientRect.left,
    height: clientRect.bottom - clientRect.top
  };
}

/**
 * Reports whether an ancestor scroller is an element.
 *
 * @param scroller - Ancestor scroller to classify.
 * @returns Whether the scroller exposes element geometry.
 */
function isElementScroller(scroller: AncestorScroller): scroller is HTMLElement {
  return typeof (scroller as HTMLElement).getBoundingClientRect === "function";
}
