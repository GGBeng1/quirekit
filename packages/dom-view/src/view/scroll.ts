import type { QuireScrollIntoViewOptions } from "@quirekit/core";

/** Vertical extent in client coordinates. */
export interface VerticalSpan {
  /** Top edge in CSS pixels. */
  readonly top: number;
  /** Bottom edge in CSS pixels. */
  readonly bottom: number;
}

/**
 * Computes how far the viewport must scroll so the target satisfies the requested alignment.
 * @param target - Target span in client coordinates.
 * @param viewport - Visible span of the scroll container in client coordinates.
 * @param options - Alignment and margin; `nearest` keeps an already visible target in place.
 * @returns Vertical scroll delta in CSS pixels; positive scrolls content up.
 */
export function scrollDelta(target: VerticalSpan, viewport: VerticalSpan, options: QuireScrollIntoViewOptions = {}): number {
  const margin = options.margin ?? 0;
  const top = viewport.top + margin;
  const bottom = viewport.bottom - margin;
  switch (options.block ?? "nearest") {
    case "start": return target.top - top;
    case "end": return target.bottom - bottom;
    case "center": return (target.top + target.bottom) / 2 - (viewport.top + viewport.bottom) / 2;
    default:
      // A target taller than the viewport reveals its start, like the browser's own nearest alignment.
      if (target.top < top || target.bottom - target.top > bottom - top) return target.top - top;
      return target.bottom > bottom ? target.bottom - bottom : 0;
  }
}

/**
 * Finds the element whose vertical scrolling reveals content inside `start`.
 * @param start - Element inside the scrolled content.
 * @returns Nearest vertically scrollable ancestor, or null for the document viewport.
 */
export function scrollContainer(start: HTMLElement): HTMLElement | null {
  const view = start.ownerDocument.defaultView;
  for (let element = start.parentElement; element; element = element.parentElement) {
    const overflow = view?.getComputedStyle(element).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && element.scrollHeight > element.clientHeight) return element;
  }
  return null;
}
