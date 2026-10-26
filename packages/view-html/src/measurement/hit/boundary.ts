import type { CreateHtmlDomMeasurementProviderOptions, HtmlMeasuredPosition } from "../types";
import { htmlTextblockOwner } from "../owner";
import { acceptHtmlCaretCandidate, readHtmlCaretCandidate } from "./candidate";
import type { HtmlBlockHitTarget } from "./types";

/**
 * Resolves a point inside one spatially chosen block, never the document shell.
 * @param options - Retained document and browser caret authority.
 * @param target - Visible local block in current client coordinates.
 * @param left - Original client x coordinate.
 * @param top - Original client y coordinate.
 * @returns Local text caret or an opaque block's before/after boundary.
 */
export function resolveHtmlLocalBlockBoundary(
  options: CreateHtmlDomMeasurementProviderOptions,
  target: HtmlBlockHitTarget,
  left: number,
  top: number
): HtmlMeasuredPosition | null {
  const { descriptor, rect } = target;
  const block = htmlTextblockOwner(descriptor);
  if (block?.mount?.contentDOM) {
    // Browser caret precision remains authoritative for wrapping, bidi and font
    // metrics. Only the point's block ownership comes from retained geometry.
    const x = clampInside(left, rect.x, rect.width), y = clampInside(top, rect.y, rect.height);
    const accepted = acceptHtmlCaretCandidate(options, readHtmlCaretCandidate(options.ownerDocument, x, y), block, x);
    if (accepted) return accepted;
    if (block.node.content.size && top > rect.y && top < rect.y + rect.height) return null;
  }
  const after = top >= rect.y + rect.height / 2;
  const textInset = block?.mount?.contentDOM ? 1 : 0;
  return {
    pos: after ? descriptor.range.to - textInset : descriptor.range.from + textInset,
    inside: descriptor.range.from,
    descriptorId: descriptor.id,
    source: { ...descriptor.source, range: descriptor.range },
    rootId: options.rootId,
    regionId: options.regionId
  };
}

/**
 * Projects onto the visible interior rather than a shared border or margin.
 * @param value - Original client coordinate.
 * @param start - Box's leading coordinate.
 * @param size - Box extent along this axis.
 * @returns Coordinate within the box, including fractional small boxes.
 */
function clampInside(value: number, start: number, size: number): number {
  const inset = Math.min(1, size / 2);
  return Math.max(start + inset, Math.min(value, start + size - inset));
}
