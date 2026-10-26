import type { AncestorScroller } from "./types";

/** CSS overflow values that establish a scroll container. */
const scrollableOverflow = new Set(["auto", "scroll", "overlay"]);

/**
 * Reports whether an element scrolls on either axis per its computed overflow.
 *
 * @param element - Element to test.
 * @param win - Window used to read computed style.
 * @returns Whether the element is a scroll container.
 */
function isScrollableElement(element: HTMLElement, win: Window): boolean {
  if (typeof win.getComputedStyle !== "function") {
    return false;
  }

  const style = win.getComputedStyle(element);

  return (
    scrollableOverflow.has(style.overflowY) ||
    scrollableOverflow.has(style.overflowX) ||
    scrollableOverflow.has(style.overflow)
  );
}

/**
 * Finds the nearest scrollable ancestor of an element, or the window.
 *
 * Walks up the parent chain looking for an element whose computed overflow makes
 * it a scroll container. Falls back to the window when no scrollable element is
 * found, matching how a page-scrolled document behaves. Returns `undefined` only
 * when no window is available (non-DOM environments).
 *
 * @param element - Element whose scroll container is required.
 * @returns Nearest scrollable ancestor, the window, or `undefined`.
 */
export function findScrollableAncestor(
  element: HTMLElement
): AncestorScroller | undefined {
  const win = element.ownerDocument.defaultView;

  if (!win) {
    return undefined;
  }

  let current = element.parentElement;

  while (current) {
    if (isScrollableElement(current, win)) {
      return current;
    }

    current = current.parentElement;
  }

  return win;
}
