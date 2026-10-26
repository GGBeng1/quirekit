import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutTranslation } from "../types";

/**
 * Translates a rectangle by a page-body projection.
 *
 * @param rect - Rectangle to translate.
 * @param projection - Page-body projection to apply.
 * @returns Translated rectangle.
 */
export function translateQuireRect(
  rect: QuireRect,
  projection: QuireLayoutTranslation
): QuireRect {
  return {
    x: rect.x + projection.dx,
    y: rect.y + projection.dy,
    width: rect.width,
    height: rect.height
  };
}
