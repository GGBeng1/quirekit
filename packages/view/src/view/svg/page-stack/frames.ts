import type { QuirePageStackFrameElements } from "../../shared/page-stack/types";
import type { QuireRect } from "@quirekit/renderer";
import { createPageStackFrameElements, positionPageStackFrame } from "../../shared/page-stack/frames";

/** One mounted SVG page surface: a positioned frame with content and overlay svgs. */
export type SvgPageStackFrameElements = QuirePageStackFrameElements<SVGSVGElement>;

/**
 * Creates a detached SVG page frame with content and overlay svgs.
 * @param ownerDocument - Document used to create elements.
 * @returns Detached SVG page frame bundle.
 */
export function createSvgPageStackFrameElements(
  ownerDocument: Document
): SvgPageStackFrameElements {
  return createPageStackFrameElements(ownerDocument, "qk-svg-editor", () => ownerDocument.createElementNS("http://www.w3.org/2000/svg", "svg"));
}

/**
 * Positions a frame at its page rectangle and sets each svg's page-local viewBox.
 *
 * The viewBox maps the document-space display list into the page and clips it,
 * the SVG analog of the canvas per-page transform.
 *
 * @param elements - Frame bundle to position and size.
 * @param pageIndex - Page index the frame now hosts, stamped for diagnostics.
 * @param pageRect - Page rectangle in document space.
 */
export function applySvgPageStackFrameGeometry(
  elements: SvgPageStackFrameElements,
  pageIndex: number,
  pageRect: QuireRect
): void {
  elements.frame.style.visibility = "hidden";
  elements.frame.dataset.qkPage = String(pageIndex);
  positionPageStackFrame(elements.frame, pageRect);
  sizeSvgPageSurface(elements.content, pageRect);
  sizeSvgPageSurface(elements.overlay, pageRect);
}

/**
 * Sizes a page svg to its page rectangle and sets its document-space viewBox.
 * @param svg - SVG surface to size.
 * @param pageRect - Page rectangle in document space.
 */
function sizeSvgPageSurface(svg: SVGSVGElement, pageRect: QuireRect): void {
  svg.style.width = `${pageRect.width}px`;
  svg.style.height = `${pageRect.height}px`;
  svg.setAttribute(
    "viewBox",
    `${pageRect.x} ${pageRect.y} ${pageRect.width} ${pageRect.height}`
  );
}
