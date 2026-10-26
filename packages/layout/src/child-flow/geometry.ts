import type { QuireRect } from "@quirekit/renderer";

/**
 * Reports whether a rectangle intersects one source-flow band.
 *
 * @param rect - Source-flow local rectangle.
 * @param top - Inclusive band top.
 * @param bottom - Exclusive band bottom.
 * @returns Whether the rectangle intersects the band.
 */
export function rectIntersectsQuireChildFlowBand(
  rect: QuireRect,
  top: number,
  bottom: number
): boolean {
  return rect.y < bottom && rect.y + rect.height > top;
}

/**
 * Translates a rectangle by one child-flow transform.
 *
 * @param rect - Source rectangle.
 * @param transform - Horizontal and vertical translation.
 * @returns Translated rectangle.
 */
export function translateQuireChildFlowRect(
  rect: QuireRect,
  transform: { readonly x: number; readonly y: number }
): QuireRect {
  return {
    x: rect.x + transform.x,
    y: rect.y + transform.y,
    width: rect.width,
    height: rect.height
  };
}
