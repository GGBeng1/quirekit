import type { HtmlMeasuredClientRect } from "../measurement";
import type { HtmlSelectionRectPool } from "./types";

const svgNamespace = "http://www.w3.org/2000/svg";

/**
 * Creates an owned SVG selection surface and its retained rectangle pool.
 * @param ownerDocument - Browser document used to allocate SVG elements.
 * @param host - Overlay host receiving the owned selection surface.
 * @returns Rectangle pool with isolated cleanup.
 */
export function createHtmlSelectionRectPool(
  ownerDocument: Document,
  host: HTMLElement
): HtmlSelectionRectPool {
  const elements: SVGRectElement[] = [];
  const surface = ownerDocument.createElementNS(svgNamespace, "svg");
  let visibleCount = 0;
  surface.setAttribute("class", "qk-html-editor__selection");
  surface.setAttribute("aria-hidden", "true");
  Object.assign(surface.style, {
    position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
    overflow: "visible", pointerEvents: "none", zIndex: "2"
  });
  host.appendChild(surface);

  /**
   * Returns a stable rectangle element for one pool index.
   *
   * @param index - Required rectangle slot.
   * @returns Existing or newly allocated rectangle element.
   */
  function requireElement(index: number): SVGRectElement {
    const existing = elements[index];
    if (existing !== undefined) {
      return existing;
    }
    const element = ownerDocument.createElementNS(svgNamespace, "rect");
    element.setAttribute("class", "qk-html-editor__selection-rect");
    element.dataset.qkSelectionRect = "";
    element.style.display = "none";
    surface.appendChild(element);
    elements.push(element);
    return element;
  }

  return {
    /**
     * Synchronizes pooled rectangles from one geometry batch.
     * @param rects - Client-space selection rectangles.
     * @param surfaceClientRect - Content surface origin in client coordinates.
     * @param fillStyle - CSS fill applied to visible rectangles.
     */
    sync(
      rects: readonly HtmlMeasuredClientRect[],
      surfaceClientRect: Pick<DOMRect, "left" | "top">,
      fillStyle: string
    ): void {
      syncAttribute(surface, "fill", fillStyle);
      // No viewBox scaling: client CSS pixels project into content SVG user space.
      // This write phase performs no layout reads and skips unchanged attributes.
      for (let index = 0; index < rects.length; index += 1) {
        const rect = rects[index]!;
        const element = requireElement(index);
        syncAttribute(element, "x", rect.left - surfaceClientRect.left);
        syncAttribute(element, "y", rect.top - surfaceClientRect.top);
        syncAttribute(element, "width", Math.max(rect.right - rect.left, 0));
        syncAttribute(element, "height", Math.max(rect.bottom - rect.top, 0));
        if (element.style.display !== "block") element.style.display = "block";
      }
      for (let index = rects.length; index < visibleCount; index += 1) {
        elements[index]!.style.display = "none";
      }
      visibleCount = rects.length;
    },
    /** Removes the owned SVG surface and releases every pooled rectangle. */
    destroy(): void {
      surface.remove();
      elements.length = 0;
      visibleCount = 0;
    }
  };
}

/**
 * Writes one SVG presentation attribute only when its serialized value changes.
 * @param element - Owned SVG root or rectangle.
 * @param name - Presentation attribute name.
 * @param value - Next CSS color or user-space geometry value.
 */
function syncAttribute(element: SVGElement, name: string, value: string | number): void {
  const next = String(value);
  if (element.getAttribute(name) !== next) element.setAttribute(name, next);
}
