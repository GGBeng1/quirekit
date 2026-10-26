import type { QuireRetainedLayerContribution } from "../../layout/region-products";

/**
 * Tests whether one conditional contribution's related story owns selection.
 *
 * @param contribution - Retained owner contribution with optional related range.
 * @param selectionFrom - Current selection start.
 * @param selectionTo - Current selection end.
 * @returns Whether the related nested story is the active selection authority.
 */
export function isQuireNestedStorySelectionActive(
  contribution: QuireRetainedLayerContribution,
  selectionFrom: number,
  selectionTo: number
): boolean {
  const relatedRange = contribution.activation?.relatedRange;
  return relatedRange !== undefined
    && selectionFrom >= relatedRange.from
    && selectionTo <= relatedRange.to;
}
