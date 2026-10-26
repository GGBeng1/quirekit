import type { QuireScrollIntoViewOptions } from "@quirekit/core";
import { resolveMountedViewScrollMove } from "./align";
import { readMountedViewScrollInset } from "./insets";
import type { QuireMountedEditorView } from "../types";
import type { MountedViewScrollRect } from "./types";

/** Attribute a host sets on an ancestor whose outer scrolling it manages itself. */
const scrollBoundaryAttribute = "data-qk-scroll-boundary";

/**
 * Scrolls a rectangle through the mounted root's ancestor chain.
 *
 * Each scroll container aligns the rectangle with the requested `block`, like
 * `Element.scrollIntoView`; the margin defaults to the PM `scrollMargin` prop.
 * The walk ends after the document viewport, a fixed/sticky ancestor, or an
 * ancestor marked with `data-qk-scroll-boundary`.
 *
 * @param view - Mounted view owning the rectangle.
 * @param startRect - Viewport rectangle to reveal.
 * @param options - Alignment and margin.
 */
export function scrollMountedViewRectIntoAncestorChain(
  view: QuireMountedEditorView,
  startRect: MountedViewScrollRect,
  options: QuireScrollIntoViewOptions = {}
): void {
  const threshold = readMountedViewScrollInset(view, "scrollThreshold", 0);
  const margin = options.margin ?? readMountedViewScrollInset(view, "scrollMargin", 5);
  const ownerDocument = view.elements.root.ownerDocument;
  let rect = startRect;

  // Selection scrolling starts at the editor surface ownership root; the hidden
  // input proxy is an absolutely positioned synchronization node, not a scroll owner.
  for (
    let node: Node | null = view.elements.root;
    node != null;
    node = resolveNextScrollParent(node)
  ) {
    if (node.nodeType !== 1) {
      continue;
    }

    const element = node as HTMLElement;
    const isViewport =
      element === ownerDocument.body || element === ownerDocument.documentElement;
    const bounds = isViewport
      ? getMountedViewWindowRect(ownerDocument)
      : getMountedViewElementRect(element);
    const move = resolveMountedViewScrollMove(rect, bounds, threshold, margin, options.block);

    if (move.x !== 0 || move.y !== 0) {
      rect = scrollMountedViewElement(element, ownerDocument, isViewport, move, rect);
    }

    // `body` and `html` both stand for the window, which is scrolled at most once.
    if (isViewport || isFixedOrSticky(element) || isScrollBoundary(element)) {
      break;
    }
  }
}

/**
 * Applies one scroll delta to an element or viewport.
 *
 * @param element - Current scroll ancestor.
 * @param ownerDocument - Document that owns the mounted view.
 * @param isViewport - Whether the current ancestor is the document viewport.
 * @param move - Scroll delta to apply.
 * @param rect - Rectangle before the scroll delta.
 * @returns Rectangle adjusted by the actual element scroll delta.
 */
function scrollMountedViewElement(
  element: HTMLElement,
  ownerDocument: Document,
  isViewport: boolean,
  move: { readonly x: number; readonly y: number },
  rect: MountedViewScrollRect
): MountedViewScrollRect {
  if (isViewport) {
    ownerDocument.defaultView?.scrollBy?.(move.x, move.y);

    return rect;
  }

  const previousLeft = element.scrollLeft;
  const previousTop = element.scrollTop;

  element.scrollLeft += move.x;
  element.scrollTop += move.y;

  const deltaLeft = element.scrollLeft - previousLeft;
  const deltaTop = element.scrollTop - previousTop;

  return {
    left: rect.left - deltaLeft,
    right: rect.right - deltaLeft,
    top: rect.top - deltaTop,
    bottom: rect.bottom - deltaTop
  };
}

/**
 * Reads viewport bounds for the owner document.
 *
 * @param ownerDocument - Document that owns the mounted view.
 * @returns Viewport rectangle.
 */
function getMountedViewWindowRect(ownerDocument: Document): MountedViewScrollRect {
  const viewport = ownerDocument.defaultView?.visualViewport;

  if (viewport) {
    return {
      left: 0,
      right: viewport.width,
      top: 0,
      bottom: viewport.height
    };
  }

  return {
    left: 0,
    right: ownerDocument.documentElement.clientWidth,
    top: 0,
    bottom: ownerDocument.documentElement.clientHeight
  };
}

/**
 * Reads visible bounds for a scrollable element.
 *
 * @param element - Scrollable element.
 * @returns Element viewport rectangle.
 */
function getMountedViewElementRect(element: HTMLElement): MountedViewScrollRect {
  const rect = element.getBoundingClientRect();
  const width = element.clientWidth || rect.width || rect.right - rect.left;
  const height = element.clientHeight || rect.height || rect.bottom - rect.top;

  return {
    left: rect.left,
    right: rect.left + width,
    top: rect.top,
    bottom: rect.top + height
  };
}

/**
 * Resolves the next ancestor that may participate in scrolling.
 *
 * @param node - Current DOM node.
 * @returns Next ancestor node.
 */
function resolveNextScrollParent(node: Node): Node | null {
  const element = node as HTMLElement;

  return element.parentNode;
}

/**
 * Reports whether an element stops scroll propagation in PM's default model.
 *
 * @param element - Element to inspect.
 * @returns Whether the element is fixed or sticky positioned.
 */
function isFixedOrSticky(element: HTMLElement): boolean {
  const view = element.ownerDocument.defaultView;
  const position = view?.getComputedStyle?.(element).position;

  return position === "fixed" || position === "sticky";
}

/**
 * Reports whether a host manages scrolling outside an element itself.
 *
 * @param element - Element to inspect.
 * @returns Whether the element carries the scroll boundary attribute.
 */
function isScrollBoundary(element: HTMLElement): boolean {
  return element.hasAttribute?.(scrollBoundaryAttribute) === true;
}
