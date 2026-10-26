import { resolveQuireTableCellInsets } from "../metrics";
import type { QuireTableSourceCell, QuireTableCellGeometry, QuireTableLayoutInput } from "../types";

/**
 * Resolves the content origin for normalized vertical alignment.
 *
 * @param cell - Source cell carrying vertical alignment metadata.
 * @param contentRect - Full cell content area used for clipping.
 * @param measuredHeight - Measured recursive content height.
 * @returns Content layout rectangle, or undefined for top alignment.
 */
export function alignCellContentRect(
  cell: QuireTableSourceCell,
  contentRect: QuireTableCellGeometry["contentRect"],
  measuredHeight: number
): QuireTableCellGeometry["contentLayoutRect"] {
  const freeSpace = Math.max(0, contentRect.height - measuredHeight);

  if (freeSpace === 0 || cell.verticalAlign === null || cell.verticalAlign === "top") {
    return undefined;
  }

  const offset = cell.verticalAlign === "bottom"
    ? freeSpace
    : freeSpace / 2;

  return {
    ...contentRect,
    y: contentRect.y + offset,
    height: Math.max(0, contentRect.height - offset)
  };
}

/**
 * Insets a full cell rectangle to its content rectangle.
 *
 * @param input - Table layout constraints.
 * @param cell - Source cell whose margin metadata should be applied.
 * @param rect - Full cell rectangle.
 * @param constrainOrigin - Keeps a final empty clip within a very short cell.
 * @returns Content rectangle inside padding and border.
 */
export function insetCellRect(
  input: QuireTableLayoutInput,
  cell: QuireTableSourceCell,
  rect: QuireTableCellGeometry["rect"],
  constrainOrigin = false
): QuireTableCellGeometry["contentRect"] {
  const insets = resolveQuireTableCellInsets(input, cell, rect);

  return {
    x: rect.x + insets.left,
    y: rect.y + (constrainOrigin ? Math.min(insets.top, rect.height) : insets.top),
    width: Math.max(0, rect.width - insets.left - insets.right),
    height: Math.max(0, rect.height - insets.top - insets.bottom)
  };
}
