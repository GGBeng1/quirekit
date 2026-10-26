import type { QuireKitFloatingPanelLayout, QuireKitFloatingPanelPosition, QuireKitFloatingPanelRect } from "./types";

/**
 * Fits a utility card to its viewport, retaining a user placement when possible.
 * @param boundary - Viewport client area in product-root CSS coordinates.
 * @param height - Measured card height after content has mounted.
 * @param position - User placement, or null to anchor at the top-right corner.
 * @returns Card width, height limit and bounded root-local origin.
 */
export function resolveFloatingPanelLayout(
  boundary: QuireKitFloatingPanelRect, height: number, position: QuireKitFloatingPanelPosition | null
): QuireKitFloatingPanelLayout {
  const inset = Math.min(12, boundary.width / 2, boundary.height / 2);
  const width = Math.max(0, Math.min(340, boundary.width - inset * 2));
  const maxHeight = Math.max(0, boundary.height - inset * 2);
  const left = boundary.x + inset, top = boundary.y + inset;
  const right = boundary.x + boundary.width - inset - width;
  const bottom = boundary.y + boundary.height - inset - Math.min(height, maxHeight);
  return { width, maxHeight,
    x: Math.min(Math.max(position?.x ?? right, left), right),
    y: Math.min(Math.max(position?.y ?? top, top), bottom) };
}
