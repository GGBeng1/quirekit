import type { QuireKitCommentAnchorProjection, QuireKitCommentCardGeometry, QuireKitCommentRailLayout } from './types';

/**
 * Converts a viewport anchor into a rail coordinate. Anchor and rail share one scroll owner,
 * so their difference stays the same while the document scrolls.
 * @param input - Current viewport geometry.
 * @returns Anchor top relative to the comment-list origin.
 */
export function projectQuireCommentAnchor(input: QuireKitCommentAnchorProjection): number {
  return finite(input.anchorClientY) - finite(input.railClientY);
}

/**
 * Places cards in document order with one forward pass: each card sits at its anchor
 * unless that would overlap the previous card, in which case it is pushed down.
 * @param cards - Measured cards in document-anchor order.
 * @param documentHeight - Rail height available through the document bottom.
 * @param minimumGap - Separation between adjacent cards.
 * @returns Card tops and overflow state.
 */
export function layoutQuireCommentRail(cards: readonly QuireKitCommentCardGeometry[], documentHeight: number, minimumGap = 12): QuireKitCommentRailLayout {
  const floor = nonNegative(documentHeight), gap = nonNegative(minimumGap), cardTops: number[] = [];
  let bottom = 0;
  for (const [index, card] of cards.entries()) {
    const top = Math.max(nonNegative(card.anchorTop), index === 0 ? 0 : bottom + gap);
    cardTops.push(top);
    bottom = top + nonNegative(card.cardHeight);
  }
  const stackBottom = cards.length ? bottom : 0;
  return { cardTops, stackBottom, railHeight: Math.max(floor, stackBottom), hasDocumentOverflow: stackBottom > floor };
}

/** @param value - Browser or caller supplied CSS-pixel value. @returns The value, or zero when not finite. */
function finite(value: number): number { return Number.isFinite(value) ? value : 0; }

/** @param value - Browser or caller supplied CSS-pixel dimension. @returns A finite non-negative value. */
function nonNegative(value: number): number { return Math.max(0, finite(value)); }
