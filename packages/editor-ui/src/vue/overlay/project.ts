import type { EditorUIAnchoredOverlayAnchor } from "./types";

/**
 * Projects a viewport point into the document overlay's local coordinate space.
 *
 * Extensions that do not use Vue can apply the returned point directly to an
 * absolutely positioned public component or custom semantic surface.
 *
 * @param anchor - Semantic target point in viewport CSS pixels.
 * @param overlayHost - Product document overlay that will own the surface.
 * @returns Point local to the overlay host in CSS pixels.
 */
export function projectEditorUIAnchoredOverlayAnchor(
  anchor: EditorUIAnchoredOverlayAnchor,
  overlayHost: HTMLElement
): EditorUIAnchoredOverlayAnchor {
  const rect = overlayHost.getBoundingClientRect();
  return {
    x: anchor.x - rect.left,
    y: anchor.y - rect.top,
    ...(anchor.rects === undefined ? {} : { rects: anchor.rects.map(fragment => ({
      x: fragment.x - rect.left, y: fragment.y - rect.top,
      width: fragment.width, height: fragment.height
    })) })
  };
}
