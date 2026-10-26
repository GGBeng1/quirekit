import type { QuirePageStackFrameElements, QuirePageStackDisplayListFrame } from "../../shared/page-stack/types";
import type { QuireRect } from "@quirekit/renderer";
import { createPageStackFrameElements, positionPageStackFrame } from "../../shared/page-stack/frames";

/** One mounted page surface: a positioned frame with content and overlay canvases. */
export type CanvasPageStackFrame = CanvasPageStackFrameElements & QuirePageStackDisplayListFrame;

/**
 * A recyclable frame DOM bundle: the positioned wrapper and its two canvases.
 *
 * The frame manager pools these so scrolling reuses canvas backing stores instead
 * of allocating a fresh pair for every page that scrolls into view.
 */
export type CanvasPageStackFrameElements = QuirePageStackFrameElements<HTMLCanvasElement>;

/**
 * Creates a detached frame element with content and overlay canvases.
 *
 * The returned bundle is not appended to any host; the frame manager attaches it
 * when a page becomes visible and detaches it (back into the pool) when the page
 * scrolls out.
 *
 * @param ownerDocument - Owner document used to create elements.
 * @returns Frame element and its canvases, detached from the document.
 */
export function createCanvasPageStackFrameElements(
  ownerDocument: Document
): CanvasPageStackFrameElements {
  return createPageStackFrameElements(ownerDocument, "qk-canvas-editor", () => ownerDocument.createElement("canvas"));
}

/**
 * Positions and sizes a frame bundle for the page it now hosts.
 *
 * Equal-size backing stores survive pooling; the complete page painter clears
 * stale pixels before reuse. Actual resizing invalidates the overlay clear epoch.
 *
 * @param elements - Frame bundle to position and size.
 * @param pageIndex - Page index the frame now hosts, stamped for diagnostics.
 * @param pageRect - Page rectangle in document space.
 * @param devicePixelRatio - Device pixel ratio for the canvas backing stores.
 */
export function applyCanvasPageStackFrameGeometry(
  elements: CanvasPageStackFrameElements,
  pageIndex: number,
  pageRect: QuireRect,
  devicePixelRatio: number
): void {
  elements.frame.style.visibility = "hidden";
  elements.frame.dataset.qkPage = String(pageIndex);
  positionPageStackFrame(elements.frame, pageRect);
  sizeCanvasPageStackCanvas(elements.content, pageRect, devicePixelRatio);
  if (sizeCanvasPageStackCanvas(elements.overlay, pageRect, devicePixelRatio)) {
    const previous = Number.parseInt(elements.overlay.dataset.qkOverlayPaintEpoch ?? "0", 10);
    elements.overlay.dataset.qkOverlayPaintEpoch = String(Number.isFinite(previous) ? previous + 1 : 1);
  }
  bumpCanvasPageStackContentPaintEpoch(elements.content);
}

/**
 * Sizes a page canvas to its page rectangle with a DPR backing store.
 *
 * @param canvas - Canvas to size.
 * @param pageRect - Page rectangle in document space.
 * @param devicePixelRatio - Device pixel ratio for the backing store.
 * @returns Whether native resizing cleared the canvas.
 */
function sizeCanvasPageStackCanvas(
  canvas: HTMLCanvasElement,
  pageRect: QuireRect,
  devicePixelRatio: number
): boolean {
  canvas.style.width = `${pageRect.width}px`;
  canvas.style.height = `${pageRect.height}px`;
  const width = Math.max(Math.round(pageRect.width * devicePixelRatio), 0);
  const height = Math.max(Math.round(pageRect.height * devicePixelRatio), 0);
  return resizeCanvasBackingStore(canvas, width, height);
}

/**
 * Changes native dimensions without allocating an intermediate cross-product.
 * @param canvas - Content or transient surface.
 * @param width - Final backing width in pixels.
 * @param height - Final backing height in pixels.
 * @returns Whether pixels were cleared by an actual size change.
 */
function resizeCanvasBackingStore(canvas: HTMLCanvasElement, width: number, height: number): boolean {
  if (canvas.width === width && canvas.height === height) return false;

  // Reserve only the final pixel area: avoid allocating new-width × old-height
  // while changing both axes, and do not reset native buffers during equal-size scrolling.
  if (canvas.width !== width && canvas.height !== height) canvas.height = 0;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return true;
}

/**
 * Invalidates accepted content when a frame acquires new geometry or page ownership.
 *
 * @param canvas - Content canvas requiring full paint or an exact bitmap restore.
 */
function bumpCanvasPageStackContentPaintEpoch(canvas: HTMLCanvasElement): void {
  const previous = Number.parseInt(canvas.dataset.qkContentPaintEpoch ?? "0", 10);
  canvas.dataset.qkContentPaintEpoch = String(Number.isFinite(previous) ? previous + 1 : 1);
}
