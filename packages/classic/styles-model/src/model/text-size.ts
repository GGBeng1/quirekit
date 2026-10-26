import type { WordNamedParagraphStyle } from "./types";

/**
 * Keeps the legacy scale editor compatible with imported absolute point sizes.
 * Explicit absolute-size changes are authoritative; changing only the scale
 * preserves its original document-default basis instead of assuming 12pt.
 * @param before - Existing definition, including its imported size basis.
 * @param after - Complete replacement supplied by the named-style command.
 * @returns Replacement whose two size representations agree.
 */
export function synchronizeWordStyleFontSize(before: WordNamedParagraphStyle, after: WordNamedParagraphStyle): WordNamedParagraphStyle {
  const oldScale = before.text.fontScale, nextScale = after.text.fontScale;
  const size = before.text.fontSize?.match(/^(\d+(?:\.\d+)?)pt$/u);
  if (!size || after.text.fontSize !== before.text.fontSize || nextScale === oldScale
    || !oldScale || nextScale === undefined || !Number.isFinite(nextScale) || nextScale <= 0) return after;
  const points = Math.round(Number(size[1]) * nextScale / oldScale * 2) / 2;
  return { ...after, text: { ...after.text, fontSize: `${points}pt` } };
}
