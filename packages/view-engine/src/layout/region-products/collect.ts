import type { QuireLayoutNode } from "../types";
import type { QuireRetainedRegionProducts } from "./types";

/**
 * Collects retained-region products from one adapted layout subtree.
 *
 * @param node - Adapted layout node to inspect recursively.
 * @returns Stable preorder aggregation of canonical products and gaps.
 */
export function collectQuireLayoutRetainedRegionProducts(
  node: QuireLayoutNode
): QuireRetainedRegionProducts {
  const nested = (node.children ?? []).map(
    collectQuireLayoutRetainedRegionProducts
  );
  const products = node.regionProducts;

  return {
    roots: [
      ...(products?.roots ?? []),
      ...nested.flatMap((entry) => entry.roots)
    ],
    regions: [
      ...(products?.regions ?? []),
      ...nested.flatMap((entry) => entry.regions)
    ],
    hitTargets: [
      ...(products?.hitTargets ?? []),
      ...nested.flatMap((entry) => entry.hitTargets)
    ],
    layerContributions: [
      ...(products?.layerContributions ?? []),
      ...nested.flatMap((entry) => entry.layerContributions)
    ],
    selectionPolicies: [
      ...(products?.selectionPolicies ?? []),
      ...nested.flatMap((entry) => entry.selectionPolicies)
    ],
    gaps: [
      ...(products?.gaps ?? []),
      ...nested.flatMap((entry) => entry.gaps)
    ]
  };
}
