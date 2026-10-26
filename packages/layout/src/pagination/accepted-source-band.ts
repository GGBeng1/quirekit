import type { QuireMeasuredContainerItem } from "./container";

/** Source-flow band accepted by one page fragment. */
export interface QuireAcceptedSourceFlowBand {
  /** Source-flow top y coordinate. */
  readonly top: number;
  /** Source-flow bottom y coordinate. */
  readonly bottom: number;
}

/**
 * Resolves the source-flow vertical band accepted by one page fragment.
 *
 * @param items - Ordered measured items in the container.
 * @param startIndex - First item attempted on the page.
 * @param nextIndex - Exclusive index after the accepted items.
 * @returns Accepted source-flow band, or null when items do not carry source bands.
 */
export function resolveQuireAcceptedSourceFlowBand(
  items: readonly QuireMeasuredContainerItem[],
  startIndex: number,
  nextIndex: number
): QuireAcceptedSourceFlowBand | null {
  const endIndex = Math.max(startIndex, nextIndex);
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (let index = startIndex; index < endIndex; index += 1) {
    const item = items[index];
    if (!item || !hasQuireMeasuredItemSourceFlowBand(item)) {
      continue;
    }

    top = Math.min(top, item.flowTop);
    bottom = Math.max(bottom, item.flowBottom);
  }

  return top === Number.POSITIVE_INFINITY ? null : { top, bottom };
}

/**
 * Checks whether one measured item carries source-flow coordinates.
 *
 * @param item - Measured item to inspect.
 * @returns Whether the item has a complete source-flow band.
 */
function hasQuireMeasuredItemSourceFlowBand(
  item: QuireMeasuredContainerItem
): item is QuireMeasuredContainerItem & {
  readonly flowTop: number;
  readonly flowBottom: number;
} {
  return item.flowTop !== undefined && item.flowBottom !== undefined;
}
