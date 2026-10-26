import { createQuireCenterRotationTransform, type QuireAffineTransform, type QuireRect } from "@quirekit/renderer";
import type { QuireLayoutBox } from "../../../layout/engine/types";

/**
 * Reads complete measured line widths, including spaces and empty-line advances.
 * @param layout - Unwrapped story layout measured with real font metrics.
 * @returns Natural width suitable for a second, centered layout pass.
 */
export function measureDrawingTextWidth(layout: QuireLayoutBox): number {
  let width = 1;
  const lines = new Map<number, { left: number; right: number }>();
  /** @param box - Measured box whose text contributes to the natural width. */
  function visit(box: QuireLayoutBox): void {
    for (const fragment of box.textFragments ?? []) {
      const line = lines.get(fragment.rect.y) ?? { left: Infinity, right: -Infinity };
      line.left = Math.min(line.left, fragment.rect.x);
      line.right = Math.max(line.right, fragment.rect.x + fragment.rect.width);
      lines.set(fragment.rect.y, line);
    }
    if ("children" in box && Array.isArray(box.children)) box.children.forEach(visit);
  }
  visit(layout);
  for (const line of lines.values()) width = Math.max(width, line.right - line.left);
  // Preserve edge glyphs when translating a large centered measurement origin to local space.
  return width + 0.01;
}

/**
 * Fits a complete measured text frame, then rotates it about the drawing center.
 * @param natural - Translated, unscaled story rectangle.
 * @param frame - Accepted inner drawing frame.
 * @param rotation - Clockwise drawing rotation.
 * @param flipHorizontal - Mirror across the vertical centerline.
 * @param flipVertical - Mirror across the horizontal centerline.
 * @returns One affine shared by Canvas/SVG and paint bounds.
 */
export function createDrawingTextFitTransform(natural: QuireRect, frame: QuireRect, rotation: number, flipHorizontal = false, flipVertical = false): QuireAffineTransform {
  const sx = frame.width / Math.max(0.01, natural.width) * (flipHorizontal ? -1 : 1);
  const sy = frame.height / Math.max(0.01, natural.height) * (flipVertical ? -1 : 1);
  const tx = frame.x + (flipHorizontal ? frame.width : 0) - sx * natural.x;
  const ty = frame.y + (flipVertical ? frame.height : 0) - sy * natural.y;
  const rotate = createQuireCenterRotationTransform(frame, rotation);
  return { a: rotate.a * sx, b: rotate.b * sx, c: rotate.c * sy, d: rotate.d * sy,
    e: rotate.a * tx + rotate.c * ty + rotate.e, f: rotate.b * tx + rotate.d * ty + rotate.f };
}
