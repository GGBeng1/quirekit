import type { WordTableBorders, WordTableCellMargins } from "../../types";
import type { WordTableStyleBorders, WordTableStyleMargins } from "../types";

/**
 * Expands partial style borders into a complete direct-border shape.
 *
 * @param borders - Partial style borders.
 * @returns Complete borders, or null when no side is declared.
 */
export function completeWordTableStyleBorders(borders: WordTableStyleBorders): WordTableBorders | null {
  if (Object.keys(borders).length === 0) return null;
  return {
    top: borders.top ?? null,
    right: borders.right ?? null,
    bottom: borders.bottom ?? null,
    left: borders.left ?? null,
    insideH: borders.insideH ?? null,
    insideV: borders.insideV ?? null,
    ...(borders.tl2br === undefined ? {} : { tl2br: borders.tl2br }),
    ...(borders.tr2bl === undefined ? {} : { tr2bl: borders.tr2bl })
  };
}

/**
 * Expands partial style margins into a complete direct-margin shape.
 *
 * @param margins - Partial style margins.
 * @returns Complete margins, or null when no side is declared.
 */
export function completeWordTableStyleMargins(margins: WordTableStyleMargins): WordTableCellMargins | null {
  if (Object.keys(margins).length === 0) return null;
  return {
    top: margins.top ?? null,
    right: margins.right ?? null,
    bottom: margins.bottom ?? null,
    left: margins.left ?? null
  };
}
