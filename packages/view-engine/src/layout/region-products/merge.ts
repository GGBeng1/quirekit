import type { QuireRetainedRegionProducts } from "./types";

/**
 * Merges canonical retained-region product bundles without changing identity.
 *
 * @param products - Optional product bundles in producer order.
 * @returns Combined bundle, or undefined when no producer contributed products.
 */
export function mergeQuireRetainedRegionProductSets(
  products: readonly (QuireRetainedRegionProducts | undefined)[]
): QuireRetainedRegionProducts | undefined {
  const present = products.filter(
    (entry): entry is QuireRetainedRegionProducts => entry !== undefined
  );

  if (present.length === 0) {
    return undefined;
  }

  return {
    roots: present.flatMap((entry) => entry.roots),
    regions: present.flatMap((entry) => entry.regions),
    hitTargets: present.flatMap((entry) => entry.hitTargets),
    layerContributions: present.flatMap((entry) => entry.layerContributions),
    selectionPolicies: present.flatMap((entry) => entry.selectionPolicies),
    gaps: present.flatMap((entry) => entry.gaps)
  };
}
