import type { QuireLayoutRegionRef } from "@quirekit/layout/identity";

/**
 * Compares logical region identity before or after page-occurrence projection.
 * @param left - First retained region address.
 * @param right - Second retained region address.
 * @returns Whether root and region ids match independently of visual occurrence.
 */
export function matchesQuireLogicalRegion(left: QuireLayoutRegionRef, right: QuireLayoutRegionRef): boolean {
  return left.rootId.value === right.rootId.value
    && left.regionId.value === right.regionId.value;
}

/**
 * Compares the exact retained occurrence that owns geometry and interaction.
 * @param left - First retained region address.
 * @param right - Second retained region address.
 * @returns Whether logical identity and the optional visual-instance id all match.
 */
export function matchesQuireRegionOccurrence(left: QuireLayoutRegionRef, right: QuireLayoutRegionRef): boolean {
  return matchesQuireLogicalRegion(left, right)
    && left.visualInstanceId === right.visualInstanceId;
}
