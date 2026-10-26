import type { ClassicEditorPopupMenuAnchor } from "./types";
import { projectClassicEditorAnchoredOverlayAnchor } from "../anchored-overlay/host";

/**
 * Preserves the last valid point while a controlled menu completes its leave transition.
 *
 * @param current - Last valid point already owned by the menu.
 * @param next - Latest semantic point, or null after its target disappears.
 * @returns Latest valid point without ever falling back to the viewport origin.
 */
export function retainClassicEditorPopupMenuAnchor(
  current: ClassicEditorPopupMenuAnchor,
  next: ClassicEditorPopupMenuAnchor | null
): ClassicEditorPopupMenuAnchor {
  return next ?? current;
}

/**
 * Resolves the product-owned document-space layer beside the mounted View.
 *
 * @param themeRoot - Classic Editor product root containing the mounted View.
 * @returns Current product document overlay host, or null before shell mount.
 */
export function resolveClassicEditorPopupMenuOverlayHost(
  themeRoot: HTMLElement
): HTMLElement | null {
  return themeRoot.querySelector<HTMLElement>("[data-qk-classic-document-overlays]");
}

/**
 * Converts a viewport point into the product overlay's document space.
 *
 * The overlay and its absolutely positioned descendants share the workspace's
 * scrolling ancestor, so this conversion is needed only when semantic geometry
 * changes rather than on every native scroll.
 *
 * @param anchor - Semantic target point in viewport CSS pixels.
 * @param overlayHost - Document-space product overlay receiving the popup.
 * @returns Point local to the overlay host in CSS pixels.
 */
export function projectClassicEditorPopupMenuAnchor(
  anchor: ClassicEditorPopupMenuAnchor,
  overlayHost: HTMLElement
): ClassicEditorPopupMenuAnchor {
  return projectClassicEditorAnchoredOverlayAnchor(anchor, overlayHost);
}
