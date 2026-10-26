import type { QuirePathSegment } from "../../core/display-list";
import type { Canvas2DRenderTarget } from "../types";
import type {
  CanvasGlyphPathOutline,
  CanvasGlyphPathTarget
} from "./types";

/**
 * Applies a glyph-local outline into the target path at a translated origin.
 *
 * @param target - Canvas path target to mutate.
 * @param outline - Glyph-local path outline to apply.
 * @param offsetX - Horizontal glyph paint offset.
 * @param offsetY - Vertical glyph paint offset.
 * @returns Nothing.
 */
export function applyGlyphPathOutline(
  target: CanvasGlyphPathTarget,
  outline: CanvasGlyphPathOutline,
  offsetX: number,
  offsetY: number
): void {
  for (const segment of outline.segments) {
    applyGlyphPathSegment(target, segment, offsetX, offsetY);
  }
}

/**
 * Checks whether a target supports the path APIs required for glyph outlines.
 *
 * @param target - Canvas 2D-like target to inspect.
 * @returns Whether the target can paint glyph paths.
 */
export function hasCanvasGlyphPathApis(
  target: Canvas2DRenderTarget
): target is CanvasGlyphPathTarget {
  return (
    typeof target.beginPath === "function" &&
    typeof target.moveTo === "function" &&
    typeof target.lineTo === "function" &&
    typeof target.quadraticCurveTo === "function" &&
    typeof target.bezierCurveTo === "function" &&
    typeof target.closePath === "function" &&
    typeof target.fill === "function"
  );
}

/**
 * Applies one glyph-local path segment into the target path.
 *
 * @param target - Canvas path target to mutate.
 * @param segment - Glyph-local path segment to apply.
 * @param offsetX - Horizontal glyph paint offset.
 * @param offsetY - Vertical glyph paint offset.
 * @returns Nothing.
 */
function applyGlyphPathSegment(
  target: CanvasGlyphPathTarget,
  segment: QuirePathSegment,
  offsetX: number,
  offsetY: number
): void {
  switch (segment.kind) {
    case "move-to":
      target.moveTo(segment.point.x + offsetX, segment.point.y + offsetY);
      break;
    case "line-to":
      target.lineTo(segment.point.x + offsetX, segment.point.y + offsetY);
      break;
    case "quadratic-curve-to":
      target.quadraticCurveTo(
        segment.control.x + offsetX,
        segment.control.y + offsetY,
        segment.point.x + offsetX,
        segment.point.y + offsetY
      );
      break;
    case "bezier-curve-to":
      target.bezierCurveTo(
        segment.control1.x + offsetX,
        segment.control1.y + offsetY,
        segment.control2.x + offsetX,
        segment.control2.y + offsetY,
        segment.point.x + offsetX,
        segment.point.y + offsetY
      );
      break;
    case "close-path":
      target.closePath();
      break;
  }
}
