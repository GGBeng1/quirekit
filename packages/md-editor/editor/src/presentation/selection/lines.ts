import { groupQuireSelectionTextBands } from "@quirekit/ui";
import type { SelectionPaintRect } from "./types";

/** @param rects - Fragments inside one endpoint text line, in browser order. @returns Flat visual bands preserving unselected horizontal gaps. */
function textBands(rects: readonly SelectionPaintRect[]): SelectionPaintRect[] {
  const bands = groupQuireSelectionTextBands(rects);
  const result: SelectionPaintRect[] = [];
  for (const band of bands) {
    const fragments = [...band.rects].sort((a, b) => a.left - b.left);
    let left = fragments[0]!.left, right = fragments[0]!.right;
    for (const fragment of fragments.slice(1)) {
      if (fragment.left <= right + 0.01) right = Math.max(right, fragment.right);
      else { result.push({ left, right, top: band.top, bottom: band.bottom }); left = fragment.left; right = fragment.right; }
    }
    result.push({ left, right, top: band.top, bottom: band.bottom });
  }
  return result;
}

/**
 * Normalizes endpoint text only. Fully selected intervening blocks retain their own surface boxes.
 * @param rects - One canonical range's measured browser fragments.
 * @param lines - Fragments measured within each endpoint text line, including overflowing inline padding.
 * @returns Flat text bands plus untouched block surfaces; separate native ranges must call separately.
 */
export function flattenSelectionLines(rects: readonly SelectionPaintRect[], lines: readonly (readonly SelectionPaintRect[])[]): SelectionPaintRect[] {
  const measured = lines.map(line => line.filter(rect => rect.right > rect.left && rect.bottom > rect.top));
  const owned = new Set(measured.flat().map(rectKey));
  return [...rects.filter(rect => rect.right > rect.left && rect.bottom > rect.top && !owned.has(rectKey(rect))),
    ...measured.flatMap(textBands)];
}

/** @param rect - Stable geometry from the same native measure phase. @returns Identity shared by full-range and endpoint-range measurements. */
function rectKey(rect: SelectionPaintRect): string { return `${rect.left},${rect.top},${rect.right},${rect.bottom}`; }
