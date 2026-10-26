import type { QuireRetainedRegionProducts } from "../../../region-products";

/** Mutable product bucket assigned to one explicit layout owner. */
export interface QuireLayoutProviderProductBucket {
  /** Roots owned by the layout box. */
  readonly roots: QuireRetainedRegionProducts["roots"][number][];
  /** Regions owned by the layout box. */
  readonly regions: QuireRetainedRegionProducts["regions"][number][];
  /** Hit targets owned by the layout box. */
  readonly hitTargets: QuireRetainedRegionProducts["hitTargets"][number][];
  /** Layer contributions owned by the layout box. */
  readonly layerContributions: QuireRetainedRegionProducts["layerContributions"][number][];
  /** Selection policies owned by the layout box. */
  readonly selectionPolicies: QuireRetainedRegionProducts["selectionPolicies"][number][];
  /** Product gaps retained on the provider root. */
  readonly gaps: QuireRetainedRegionProducts["gaps"][number][];
}

/**
 * Returns a mutable product bucket for one layout owner.
 *
 * @param buckets - Mutable buckets indexed by layout identity.
 * @param owner - Layout box that owns the bucket.
 * @returns Existing or newly allocated bucket.
 */
export function getQuireLayoutProviderProductBucket<Owner>(
  buckets: Map<Owner, QuireLayoutProviderProductBucket>,
  owner: Owner
): QuireLayoutProviderProductBucket {
  const existing = buckets.get(owner);
  if (existing !== undefined) {
    return existing;
  }
  const bucket: QuireLayoutProviderProductBucket = {
    roots: [],
    regions: [],
    hitTargets: [],
    layerContributions: [],
    selectionPolicies: [],
    gaps: []
  };
  buckets.set(owner, bucket);
  return bucket;
}

/**
 * Converts one assigned bucket into canonical immutable products.
 *
 * @param bucket - Mutable assignment bucket.
 * @returns Canonical product set.
 */
export function toQuireRetainedRegionProductSet(
  bucket: QuireLayoutProviderProductBucket
): QuireRetainedRegionProducts {
  return {
    roots: bucket.roots,
    regions: bucket.regions,
    hitTargets: bucket.hitTargets,
    layerContributions: bucket.layerContributions,
    selectionPolicies: bucket.selectionPolicies,
    gaps: bucket.gaps
  };
}
