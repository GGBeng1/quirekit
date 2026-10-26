import type { QuireRect } from "@quirekit/renderer";
import type { QuirePageFrame, QuirePageSurfaceAdapter } from "../../shared";
import {
  applyCanvasPageStackFrameGeometry,
  createCanvasPageStackFrameElements,
  type CanvasPageStackFrame,
  type CanvasPageStackFrameElements
} from "./frames";

/**
 * Creates the canvas page surface adapter.
 *
 * The adapter's surface bundle is the existing {@link CanvasPageStackFrameElements}.
 * Geometry uses the live device pixel ratio read from `getDevicePixelRatio` so a
 * DPR change re-sizes backing stores; the mount drives that via the manager's
 * `geometryEpoch`.
 *
 * @param getDevicePixelRatio - Reads the current device pixel ratio at geometry time.
 * @param retireContentSurface - Optional hook run before content pixels detach or clear.
 * @returns Canvas page surface adapter.
 */
export function createCanvasPageSurfaceAdapter(
  getDevicePixelRatio: () => number,
  retireContentSurface?: (surface: HTMLCanvasElement) => void
): QuirePageSurfaceAdapter<CanvasPageStackFrameElements> {
  return {
    markPainted(surface): void {
      surface.frame.style.visibility = "visible";
    },
    createSurface(ownerDocument: Document): CanvasPageStackFrameElements {
      return createCanvasPageStackFrameElements(ownerDocument);
    },
    applyGeometry(
      surface: CanvasPageStackFrameElements,
      pageIndex: number,
      pageRect: QuireRect
    ): void {
      retireContentSurface?.(surface.content);
      applyCanvasPageStackFrameGeometry(surface, pageIndex, pageRect, getDevicePixelRatio());
    },
    attach(surface: CanvasPageStackFrameElements, host: HTMLElement): void {
      host.appendChild(surface.frame);
    },
    detach(surface: CanvasPageStackFrameElements): void {
      retireContentSurface?.(surface.content);
      surface.frame.remove();
    },
    dispose(surface: CanvasPageStackFrameElements): void {
      // Release native backing stores at eviction, independently of GC timing.
      surface.content.width = surface.content.height = 0;
      surface.overlay.width = surface.overlay.height = 0;
    },
    estimatePooledSurfaceBytes(surface: CanvasPageStackFrameElements): number {
      return estimateCanvasPageStackSurfaceBytes(surface);
    }
  };
}

/**
 * Bridges a manager frame to the {@link CanvasPageStackFrame} the painter expects.
 *
 * @param frame - Manager frame over canvas frame elements.
 * @returns Canvas page-stack frame descriptor.
 */
export function canvasPageFrame(
  frame: QuirePageFrame<CanvasPageStackFrameElements>
): CanvasPageStackFrame {
  return {
    pageIndex: frame.pageIndex,
    pageRect: frame.pageRect,
    ...frame.surface
  };
}

/**
 * Estimates the backing-store bytes retained by a detached canvas page surface.
 *
 * @param surface - Canvas page surface bundle.
 * @returns Estimated bytes held by content and overlay canvas backing stores.
 */
function estimateCanvasPageStackSurfaceBytes(
  surface: CanvasPageStackFrameElements
): number {
  return estimateCanvasBackingStoreBytes(surface.content)
    + estimateCanvasBackingStoreBytes(surface.overlay);
}

/**
 * Estimates canvas backing-store bytes using four bytes per pixel.
 *
 * @param canvas - Canvas whose backing store is retained.
 * @returns Estimated backing-store bytes.
 */
function estimateCanvasBackingStoreBytes(canvas: HTMLCanvasElement): number {
  return canvas.width * canvas.height * 4;
}
