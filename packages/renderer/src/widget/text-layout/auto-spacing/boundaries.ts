import { parseQuireFontPixelSize } from "../../../core/font/size";
import type { RunGrapheme } from "../units";
import type { QuireTextAutoSpacing } from "./types";

const han = /^\p{Script=Han}/u;
const latin = /^(?![\uFF21-\uFF3A\uFF41-\uFF5A])\p{Script=Latin}/u;
const digit = /^[0-9]/u;

/**
 * Records potential logical boundary gaps before wrapping, leaving source anchors intact.
 * Gaps only survive if both neighbors occupy the same physical slot. Classification
 * and font-size caching are local to this layout, with one pass and no text measurement.
 * @param graphemes - Logical source graphemes carrying resolved BiDi levels.
 * @param policy - Neutral ratios selected by the document profile.
 * @returns Graphemes with candidate leading spacing; unmodified input when disabled.
 */
export function markAutomaticSpacing(
  graphemes: readonly RunGrapheme[], policy: QuireTextAutoSpacing | undefined
): readonly RunGrapheme[] {
  const alpha = policy?.ideographAlpha ?? 0, numeric = policy?.ideographNumeric ?? 0;
  if (![alpha, numeric].every(value => Number.isFinite(value) && value >= 0)) {
    throw new RangeError("Automatic text spacing ratios must be finite and non-negative.");
  }
  if (alpha === 0 && numeric === 0) return graphemes;
  const sizes = new Map<string, number>();
  return graphemes.map((right, index) => {
    const left = graphemes[index - 1];
    if (left === undefined || left.replacementInlineSize !== undefined || right.replacementInlineSize !== undefined
      || (left.level ?? 0) !== (right.level ?? 0) || (left.level ?? 0) % 2 !== 0) return right;
    const ideograph = han.test(left.text) ? left : han.test(right.text) ? right : undefined;
    if (ideograph === undefined) return right;
    if (left.characterGrid?.mode === "cells" || right.characterGrid?.mode === "cells") return right;
    const other = ideograph === left ? right : left;
    const ratio = latin.test(other.text) ? alpha : digit.test(other.text) ? numeric : 0;
    if (ratio === 0) return right;
    let size = sizes.get(ideograph.font);
    if (size === undefined) {
      size = parseQuireFontPixelSize(ideograph.font) ?? 16;
      sizes.set(ideograph.font, size);
    }
    const gridSpacing = ideograph.characterGrid?.mode === "spacing" ? ideograph.characterGrid.spacing : 0;
    return { ...right, spacingBefore: Math.max(0, size + gridSpacing) * ratio };
  });
}

/**
 * Allocates only same-slot gaps as trailing cluster advances, before justification.
 * @param graphemes - Source-order graphemes actually occupying one physical slot.
 * @param advances - Mutable natural advances shared by paint and interaction geometry.
 * @returns Layout-only trailing deltas used to split independently positioned paint runs.
 */
export function applyAutomaticSpacing(graphemes: readonly RunGrapheme[], advances: number[]): Map<number, number> {
  const spacing = new Map<number, number>();
  for (let index = 1; index < graphemes.length; index++) {
    const gap = graphemes[index]!.spacingBefore ?? 0;
    if (gap === 0) continue;
    advances[index - 1] = advances[index - 1]! + gap;
    spacing.set(index - 1, gap);
  }
  return spacing;
}
