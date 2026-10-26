import { matchesQuireLogicalRegion, matchesQuireRegionOccurrence } from "../../../owner-facts/region";
import type {
  QuireLayoutRegionRef
} from "@quirekit/layout/identity";
import type { QuireRetainedRegionProducts } from "../../../region-products";
import type {
  ProjectQuireSubLayoutRetainedProductsToPageOptions
} from "./types";
import { projectQuireNestedRegionGeometry } from "./split-box/region-geometry";
import { projectQuireRetainedRegionProductsToVisualInstance } from "./split-box/visual-instance";

/**
 * Projects provider and nested retained products into one visible page occurrence.
 *
 * @param options - Source products, page clip, translation, and occurrence identity.
 * @returns Page-local retained products with exact occurrence ownership.
 */
export function projectQuireSubLayoutRetainedProductsToPage(
  options: ProjectQuireSubLayoutRetainedProductsToPageOptions
): QuireRetainedRegionProducts {
  const projected: QuireRetainedRegionProducts[] = [];

  // Phase 1: visibility belongs to the source-flow page clip. Partition the
  // mixed provider bundle by exact region before projecting any owned product.
  for (const region of options.products.regions) {
    const primary = options.primaryRegion !== undefined
      && matchesQuireLogicalRegion(region.ref, options.primaryRegion);
    const geometry = primary
      ? { rect: options.primaryPageRect, translation: options.translation }
      : projectQuireNestedRegionGeometry(region, options);
    if (geometry === null) {
      continue;
    }

    const visualInstanceId = primary
      ? options.visualInstanceId
      : createNestedVisualInstanceId(options.visualInstanceId, region.ref);
    const pageRegion = {
      ...region.ref,
      visualInstanceId
    };
    projected.push(
      projectQuireRetainedRegionProductsToVisualInstance(
        selectExactRegionProducts(options.products, region.ref),
        region.ref,
        pageRegion,
        visualInstanceId,
        geometry.rect,
        geometry.translation
      )
    );
  }

  // Phase 2: roots remain logical and may own several page-qualified regions.
  // Other product families are already partitioned, clipped, and id-scoped.
  return {
    roots: collectUniqueRoots(projected),
    regions: projected.flatMap((products) => products.regions),
    hitTargets: projected.flatMap((products) => products.hitTargets),
    layerContributions: projected.flatMap(
      (products) => products.layerContributions
    ),
    selectionPolicies: projected.flatMap(
      (products) => products.selectionPolicies
    ),
    gaps: options.products.gaps
  };
}

/**
 * Selects all retained records owned by one exact source-flow region.
 *
 * @param products - Mixed provider and nested retained products.
 * @param region - Exact source-flow owner to select.
 * @returns Region-local bundle ready for the existing visual-instance projector.
 */
function selectExactRegionProducts(
  products: QuireRetainedRegionProducts,
  region: QuireLayoutRegionRef
): QuireRetainedRegionProducts {
  return {
    roots: products.roots.filter(
      (root) => root.id.value === region.rootId.value
    ),
    regions: products.regions.filter(
      (candidate) => matchesQuireRegionOccurrence(candidate.ref, region)
    ),
    hitTargets: products.hitTargets.filter((target) => {
      const owner = target.viewRegion
        ?? target.queryOwner?.region
        ?? target.interactionHit?.region;
      return owner !== undefined && matchesQuireRegionOccurrence(owner, region);
    }),
    layerContributions: products.layerContributions.filter(
      (contribution) => matchesQuireRegionOccurrence(contribution.owner.region, region)
    ),
    selectionPolicies: products.selectionPolicies.filter(
      (policy) => matchesQuireRegionOccurrence(policy.region, region)
    ),
    gaps: []
  };
}

/**
 * Collects logical roots once after region-local projection.
 *
 * @param projected - Page-local product bundles partitioned by region.
 * @returns Roots in first-seen order without redundant logical declarations.
 */
function collectUniqueRoots(
  projected: readonly QuireRetainedRegionProducts[]
): QuireRetainedRegionProducts["roots"] {
  const roots = new Map<string, QuireRetainedRegionProducts["roots"][number]>();
  for (const products of projected) {
    for (const root of products.roots) {
      if (!roots.has(root.id.value)) {
        roots.set(root.id.value, root);
      }
    }
  }
  return [...roots.values()];
}

/**
 * Composes a page occurrence with an optional existing repeated-instance id.
 *
 * @param pageVisualInstanceId - Owning sub-layout page occurrence.
 * @param region - Nested logical or repeated region.
 * @returns Snapshot-unique nested region occurrence id.
 */
function createNestedVisualInstanceId(
  pageVisualInstanceId: string,
  region: QuireLayoutRegionRef
): string {
  const logicalId = region.visualInstanceId
    ?? `${region.rootId.value}:${region.regionId.value}`;
  return `${pageVisualInstanceId}:${logicalId}`;
}
