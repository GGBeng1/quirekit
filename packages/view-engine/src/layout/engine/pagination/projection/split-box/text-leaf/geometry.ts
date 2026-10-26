import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireRect } from "@quirekit/renderer";
import type { QuirePageBodyProjection } from "../../types";

/**
 * Keeps a text block's horizontal editing area while clipping its vertical band.
 * Ink bounds can be narrow or empty; using them as the block clips trailing
 * carets and routes same-line blank clicks into another paragraph.
 * @param source - Original block or inline wrapping rectangle.
 * @param projection - Source-to-page translation.
 * @param visible - Accepted page-local line band.
 * @returns Page-local editing bounds with the original wrapping width.
 */
export function projectTextBlockBand(
  source: QuireRect, projection: QuirePageBodyProjection, visible: QuireRect
): QuireRect {
  return { x: source.x + projection.dx, y: visible.y,
    width: source.width, height: visible.height };
}

/**
 * Finds the first sorted fragment whose line top can intersect a clip.
 *
 * @param fragments - Text fragments sorted by increasing line top.
 * @param flowTop - Source-flow top of the first measured page clip.
 * @returns Index of the first fragment whose top is at or after `flowTop`.
 */
export function findFirstTextFragmentAtOrAfterFlowTop(
  fragments: readonly QuireTextFragment[],
  flowTop: number
): number {
  if (!Number.isFinite(flowTop)) {
    return 0;
  }

  let low = 0;
  let high = fragments.length;

  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    const y = fragments[middle]!.rect.y;

    if (y < flowTop) {
      low = middle + 1;
      continue;
    }

    high = middle;
  }

  return low;
}
