import type { CSSProperties } from "vue";
import type {
  EditorUIAnchoredOverlayAnchor,
  EditorUIAnchoredOverlayPlacement
} from "./types";

const overlayGap = "8px";

/**
 * Resolves the CSS translation for one logical placement.
 *
 * The semantic anchor is already projected into the document overlay's local
 * coordinate space. Percentage translations therefore depend only on the
 * visible surface and remain stable while the shared scroll owner moves it.
 *
 * @param placement - Requested logical alignment around the anchor.
 * @returns CSS transform applied to the public surface.
 */
export function resolveEditorUIAnchoredOverlayTransform(
  placement: EditorUIAnchoredOverlayPlacement
): string {
  switch (placement) {
    case "exact": return "none";
    case "top": return `translate(-50%, calc(-100% - ${overlayGap}))`;
    case "top-start": return `translate(0, calc(-100% - ${overlayGap}))`;
    case "top-end": return `translate(-100%, calc(-100% - ${overlayGap}))`;
    case "right": return `translate(${overlayGap}, -50%)`;
    case "right-start": return `translate(${overlayGap}, 0)`;
    case "right-end": return `translate(${overlayGap}, -100%)`;
    case "bottom": return `translate(-50%, ${overlayGap})`;
    case "bottom-start": return `translate(0, ${overlayGap})`;
    case "bottom-end": return `translate(-100%, ${overlayGap})`;
    case "left": return `translate(calc(-100% - ${overlayGap}), -50%)`;
    case "left-start": return `translate(calc(-100% - ${overlayGap}), 0)`;
    case "left-end": return `translate(calc(-100% - ${overlayGap}), -100%)`;
  }
}

/**
 * Builds positioning-only attributes for a public component surface.
 *
 * @param anchor - Point local to the product document overlay.
 * @param placement - Logical placement around the point.
 * @returns Absolute positioning without visual surface properties.
 */
export function resolveEditorUIAnchoredOverlayStyle(
  anchor: EditorUIAnchoredOverlayAnchor,
  placement: EditorUIAnchoredOverlayPlacement
): CSSProperties {
  return {
    position: "absolute",
    left: `${anchor.x}px`,
    top: `${anchor.y}px`,
    transform: resolveEditorUIAnchoredOverlayTransform(placement),
    pointerEvents: "auto"
  };
}
