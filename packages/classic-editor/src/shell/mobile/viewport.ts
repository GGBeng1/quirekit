import type { ClassicMobileVisualFrame, ClassicMobileVisualSample } from "./types";

/**
 * Intersects the host with the visual viewport in client coordinates.
 *
 * Chromium measures client rects from the layout viewport and WebKit from the
 * visual viewport, so `visualViewport.offsetTop` cannot be compared with a client
 * rect directly. Both engines agree on document coordinates: the visual top is
 * its `pageTop` shifted by the document origin's client position.
 *
 * @param host - Host rectangle in client coordinates.
 * @param visual - Visual viewport sample taken in the same measurement.
 * @returns Root offset inside the host and the visible height.
 */
export function resolveClassicMobileVisualFrame(
  host: Pick<DOMRectReadOnly, "top" | "bottom">,
  visual: ClassicMobileVisualSample
): ClassicMobileVisualFrame {
  const visualTop = visual.pageTop + visual.documentTop;
  const top = Math.max(host.top, visualTop);
  return {
    offset: Math.max(0, top - host.top),
    height: Math.max(0, Math.min(host.bottom, visualTop + visual.height) - top)
  };
}
