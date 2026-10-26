import type { QuirePoint, QuireRect } from "../core/geometry";

/**
 * Translates a rectangle by a delta.
 *
 * @param rect - Rectangle to translate.
 * @param dx - Horizontal delta.
 * @param dy - Vertical delta.
 * @returns Translated rectangle.
 */
export function translateRect(rect: QuireRect, dx: number, dy: number): QuireRect {
  return {
    ...rect,
    x: rect.x + dx,
    y: rect.y + dy
  };
}

/**
 * Translates a point by a delta.
 *
 * @param point - Point to translate.
 * @param dx - Horizontal delta.
 * @param dy - Vertical delta.
 * @returns Translated point.
 */
export function translatePoint(point: QuirePoint, dx: number, dy: number): QuirePoint {
  return {
    x: point.x + dx,
    y: point.y + dy
  };
}
