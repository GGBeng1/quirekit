import type { QuireRect } from "@quirekit/renderer";
import { createViewCoordinateAuthority } from "@quirekit/view-engine";
import { createScrollListenerSet } from "./listener-set";
import type {
  AncestorScroller,
  AncestorScrollSourceOptions,
  ScrollSource
} from "./types";

/** Client-space viewport rectangle of a scroller. */
interface ScrollerViewportRect {
  /** Viewport left edge in client coordinates. */
  readonly left: number;
  /** Viewport top edge in client coordinates. */
  readonly top: number;
  /** Visible viewport width in CSS pixels. */
  readonly width: number;
  /** Visible viewport height in CSS pixels. */
  readonly height: number;
}

/**
 * Reports whether a scroller is an element (rather than the window).
 *
 * @param scroller - Scroller to classify.
 * @returns Whether the scroller is an element with a bounding client rect.
 */
function isElementScroller(scroller: AncestorScroller): scroller is HTMLElement {
  return typeof (scroller as HTMLElement).getBoundingClientRect === "function";
}

/**
 * Resolves the client-space viewport rectangle of a scroller.
 *
 * @param scroller - Element or window scroller.
 * @returns Viewport rectangle in client coordinates.
 */
function resolveScrollerViewportRect(scroller: AncestorScroller): ScrollerViewportRect {
  if (isElementScroller(scroller)) {
    const rect = scroller.getBoundingClientRect();
    const sx = scroller.offsetWidth > 0 ? rect.width / scroller.offsetWidth : 1;
    const sy = scroller.offsetHeight > 0 ? rect.height / scroller.offsetHeight : 1;

    return {
      left: rect.left,
      top: rect.top,
      width: scroller.clientWidth * sx || rect.width || 0,
      height: scroller.clientHeight * sy || rect.height || 0
    };
  }

  const win = scroller;

  return {
    left: 0,
    top: 0,
    width: win.innerWidth || 0,
    height: win.innerHeight || 0
  };
}

/**
 * Creates a scroll source backed by a designated ancestor scroller.
 *
 * Supports the page/document scroll model where the editor grows to the full
 * document height and an external container (or the window) scrolls it. The
 * visible region is the document-space slice currently within the scroller
 * viewport, derived from the scroller's viewport rectangle minus the content
 * element's client offset, so a `content` top above the viewport maps to a
 * positive document `y`.
 *
 * @param options - Ancestor scroller and editor content element.
 * @returns Scroll source reporting the document slice within the scroller.
 */
export function createAncestorScrollSource(
  options: AncestorScrollSourceOptions
): ScrollSource {
  const { scroller, content } = options;
  const listeners = createScrollListenerSet();
  const ownerWindow = content.ownerDocument.defaultView;
  const handleChange = (): void => {
    listeners.notify();
  };
  // The HTMLElement | Window union has incompatible addEventListener overloads;
  // bind through the shared EventTarget base, whose signature is uniform.
  const scrollTarget: EventTarget = scroller;

  scrollTarget.addEventListener("scroll", handleChange, { passive: true });
  ownerWindow?.addEventListener("resize", handleChange);

  const ResizeObserverCtor = ownerWindow?.ResizeObserver;
  const resizeObserver = ResizeObserverCtor ? new ResizeObserverCtor(handleChange) : undefined;

  resizeObserver?.observe(content);

  if (resizeObserver && isElementScroller(scroller)) {
    resizeObserver.observe(scroller);
  }

  return {
    getVisibleRegion(): QuireRect {
      const viewport = resolveScrollerViewportRect(scroller);
      const contentRect = content.getBoundingClientRect();
      const authority = createViewCoordinateAuthority({
        surfaceClientRect: contentRect,
        surfaceBounds: { x: 0, y: 0, width: content.offsetWidth || contentRect.width, height: content.offsetHeight || contentRect.height }
      });
      const origin = authority.documentPointFromClient({ left: viewport.left, top: viewport.top });

      return {
        ...origin,
        width: viewport.width / authority.scaleX,
        height: viewport.height / authority.scaleY
      };
    },
    subscribe(listener: () => void): () => void {
      return listeners.add(listener);
    },
    scrollByDocument(deltaY: number): void {
      const contentRect = content.getBoundingClientRect();
      const height = content.offsetHeight || contentRect.height;
      const pixels = deltaY * (height > 0 && contentRect.height > 0 ? contentRect.height / height : 1);
      if (isElementScroller(scroller)) scroller.scrollTop += pixels;
      else scroller.scrollBy(0, pixels);
    },
    destroy(): void {
      scrollTarget.removeEventListener("scroll", handleChange);
      ownerWindow?.removeEventListener("resize", handleChange);
      resizeObserver?.disconnect();
      listeners.clear();
    }
  };
}
