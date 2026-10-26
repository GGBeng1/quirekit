import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../../layout";
import type { QuireParagraphDecoration, QuireParagraphDecorationBorder } from "../../../layout/engine/block-types";
import type { ParagraphBorderLine, ParagraphBorderRing, ParagraphDecorationSide, ParagraphFragmentBorders } from "./types";

/** @param node - Paragraph snapshot. @returns Decoration bounds without changing text wrapping or selection. */
export function paragraphDecorationRect(node: QuireLayoutNode): QuireRect {
  const rect = node.inlineLayoutRect ?? node.rect;
  const decoration = node.paragraphDecoration;
  if (decoration?.inlineOffset === undefined || decoration.inlineSize === undefined) return rect;
  return { x: rect.x + decoration.inlineOffset, y: rect.y, width: decoration.inlineSize, height: rect.height };
}

/** @param decoration - Complete paragraph metadata. @returns Visible physical borders; hidden page edges cannot extend neighbours. */
export function visibleParagraphBorders(decoration: QuireParagraphDecoration): ParagraphFragmentBorders {
  return {
    ...(decoration.firstFragment && decoration.top ? { top: decoration.top } : {}),
    ...(decoration.lastFragment && decoration.bottom ? { bottom: decoration.bottom } : {}),
    ...(decoration.left ? { left: decoration.left } : {}),
    ...(decoration.right ? { right: decoration.right } : {})
  };
}

/**
 * Separates a double border into two strokes without exceeding its reserved envelope.
 * @param border - Effective physical side.
 * @param ring - Corresponding ring; single neighbours connect to the outer ring.
 * @returns Stroke width and distance from the unchanged text rectangle.
 */
export function paragraphBorderStroke(border: QuireParagraphDecorationBorder, ring?: ParagraphBorderRing): QuireParagraphDecorationBorder {
  if (border.style !== "double") return border;
  const lineWidth = border.lineWidth / 3;
  return { ...border, lineWidth, space: border.space + (ring === "inner" ? 0 : lineWidth * 2) };
}

/**
 * Extends endpoints to adjoining stroke envelopes, keeping normal offsets independent.
 * @param side - Current physical side.
 * @param borders - Only visible fragment borders.
 * @param rect - Paragraph decoration bounds in document CSS pixels.
 * @param ring - Optional matching double-border ring.
 * @returns Centerline whose endpoints meet adjoining sides without changing the text rect.
 */
export function paragraphBorderLine(side: ParagraphDecorationSide, borders: ParagraphFragmentBorders, rect: QuireRect, ring?: ParagraphBorderRing): ParagraphBorderLine {
  const border = paragraphBorderStroke(borders[side]!, ring);
  const offset = border.space + border.lineWidth / 2;
  // Resolve neighbours after pagination filtering. Shared outer endpoints close
  // each ring; missing neighbours retain the original text interval instead.
  const left = rect.x - borderExtent(borders.left, ring);
  const right = rect.x + rect.width + borderExtent(borders.right, ring);
  const top = rect.y - borderExtent(borders.top, ring);
  const bottom = rect.y + rect.height + borderExtent(borders.bottom, ring);
  if (side === "top" || side === "bottom") {
    const y = side === "top" ? rect.y - offset : rect.y + rect.height + offset;
    return { from: { x: left, y }, to: { x: right, y } };
  }
  const x = side === "left" ? rect.x - offset : rect.x + rect.width + offset;
  return { from: { x, y: top }, to: { x, y: bottom } };
}

/** @param border - Optional adjacent edge. @param ring - Matching component. @returns Distance to its outer stroke edge. */
function borderExtent(border: QuireParagraphDecorationBorder | undefined, ring?: ParagraphBorderRing): number {
  if (!border) return 0;
  const stroke = paragraphBorderStroke(border, ring);
  return stroke.space + stroke.lineWidth;
}

/**
 * Paints the gap inside a border without expanding unbordered paragraph shading.
 * @param rect - Unchanged text decoration rectangle.
 * @param borders - Visible fragment edges only.
 * @returns Fill bounds reaching the inner border edges.
 */
export function paragraphShadingRect(rect: QuireRect, borders: ParagraphFragmentBorders): QuireRect {
  const left = borders.left?.space ?? 0;
  const right = borders.right?.space ?? 0;
  const top = borders.top?.space ?? 0;
  const bottom = borders.bottom?.space ?? 0;
  return { x: rect.x - left, y: rect.y - top, width: rect.width + left + right, height: rect.height + top + bottom };
}
