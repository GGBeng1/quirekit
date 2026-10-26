import type { QuireRect } from "@quirekit/renderer";
import type { QuirePageStackFrameElements } from "./types";

/**
 * Creates the shared positioned wrapper and its two backend drawing surfaces.
 * @param ownerDocument - Document owning the mounted editor.
 * @param classPrefix - Backend CSS namespace.
 * @param createSurface - Creates one detached Canvas or SVG surface.
 * @returns Detached frame with independently painted content and overlay.
 */
export function createPageStackFrameElements<Surface extends HTMLElement | SVGSVGElement>(
  ownerDocument: Document,
  classPrefix: string,
  createSurface: () => Surface
): QuirePageStackFrameElements<Surface> {
  const frame = ownerDocument.createElement("div");
  frame.className = `${classPrefix}__page`;
  frame.style.position = "absolute";
  frame.style.zIndex = "1";
  const content = createSurface();
  const overlay = createSurface();
  for (const [surface, layer] of [[content, "content"], [overlay, "overlay"]] as const) {
    surface.setAttribute("class", `${classPrefix}__${layer}`);
    surface.dataset.qkSurface = layer;
    frame.appendChild(surface);
  }
  return { frame, content, overlay };
}

/**
 * Applies canonical document-space geometry to paper or a backend wrapper.
 * @param frame - Positioned element using the host's document coordinates.
 * @param pageRect - Accepted page rectangle, independent of device pixel ratio.
 */
export function positionPageStackFrame(frame: HTMLElement, pageRect: QuireRect): void {
  frame.style.left = `${pageRect.x}px`;
  frame.style.top = `${pageRect.y}px`;
  frame.style.width = `${pageRect.width}px`;
  frame.style.height = `${pageRect.height}px`;
}
