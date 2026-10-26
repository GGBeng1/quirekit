import type { QuireRetainedRegionProducts } from "../../../region-products";
import type {
  QuireLayoutBox,
  QuireLayoutContainer
} from "../../../engine/types";
import {
  getQuireLayoutProviderProductBucket,
  toQuireRetainedRegionProductSet
} from "./buckets";
import type { QuireLayoutProviderProductBucket } from "./buckets";
import {
  collectQuireLayoutProviderProductOwners,
  createQuireLayoutProviderRegionKey,
  readQuireLayoutProviderHitTargetRegion
} from "./owner-index";
import type { QuireLayoutProviderProductOwner } from "./owner-index";
import { projectQuireLayoutOwnerFacts } from "../../../owner-facts";

/**
 * Installs compiled provider products on the layout boxes that explicitly own them.
 *
 * Product geometry must travel with its owning box during pagination. Keeping all
 * nested products on the provider root would let child geometry project while its
 * retained region stayed in source-flow coordinates.
 *
 * @param layout - Validated provider layout tree with explicit retained annotations.
 * @param products - Canonical products compiled from provider declarations.
 * @returns Layout tree whose products share ownership with their annotated boxes.
 */
export function installQuireLayoutProviderProducts(
  layout: QuireLayoutBox,
  products: QuireRetainedRegionProducts
): QuireLayoutBox {
  const owners = collectQuireLayoutProviderProductOwners(layout);
  const buckets = new Map<
    QuireLayoutProviderProductOwner,
    QuireLayoutProviderProductBucket
  >();
  const rootBucket = getQuireLayoutProviderProductBucket(buckets, layout);

  for (const root of products.roots) {
    getQuireLayoutProviderProductBucket(
      buckets,
      readRequiredProductOwner(
        owners.roots.get(root.id.value),
        `root "${root.id.value}"`
      )
    )
      .roots.push(root);
  }
  for (const region of products.regions) {
    getQuireLayoutProviderProductBucket(
      buckets,
      readRequiredProductOwner(
        owners.regions.get(createQuireLayoutProviderRegionKey(region.ref)),
        `region "${createQuireLayoutProviderRegionKey(region.ref)}"`
      )
    ).regions.push(region);
  }
  for (const target of products.hitTargets) {
    const region = readQuireLayoutProviderHitTargetRegion(target);
    getQuireLayoutProviderProductBucket(
      buckets,
      region === undefined
        ? layout
        : readRequiredProductOwner(
            owners.regions.get(createQuireLayoutProviderRegionKey(region)),
            `hit-target region "${createQuireLayoutProviderRegionKey(region)}"`
          )
    ).hitTargets.push(target);
  }
  for (const contribution of products.layerContributions) {
    getQuireLayoutProviderProductBucket(
      buckets,
      readRequiredProductOwner(
        owners.regions.get(
          createQuireLayoutProviderRegionKey(contribution.owner.region)
        ),
        `layer-contribution region "${createQuireLayoutProviderRegionKey(
          contribution.owner.region
        )}"`
      )
    ).layerContributions.push(contribution);
  }
  for (const policy of products.selectionPolicies) {
    getQuireLayoutProviderProductBucket(
      buckets,
      readRequiredProductOwner(
        owners.regions.get(createQuireLayoutProviderRegionKey(policy.region)),
        `selection-policy region "${createQuireLayoutProviderRegionKey(
          policy.region
        )}"`
      )
    ).selectionPolicies.push(policy);
  }
  rootBucket.gaps.push(...products.gaps);

  return projectQuireLayoutOwnerFacts(
    rebuildLayoutWithProducts(layout, buckets)
  );
}

/**
 * Rebuilds one immutable layout tree with owner-local product bundles.
 *
 * @param box - Current layout box.
 * @param buckets - Products assigned by original box identity.
 * @returns Layout box with recursively installed products.
 */
function rebuildLayoutWithProducts(
  box: QuireLayoutBox,
  buckets: ReadonlyMap<
    QuireLayoutProviderProductOwner,
    QuireLayoutProviderProductBucket
  >
): QuireLayoutBox {
  const assigned = buckets.get(box);
  const assignedProducts = assigned === undefined
    ? undefined
    : toQuireRetainedRegionProductSet(assigned);
  // A present bucket is the complete current compilation for this exact owner.
  // Reused layout may still carry the previous pass, so merging here would
  // duplicate stable root and region identity on every retained rebuild.
  const regionProducts = assignedProducts ?? box.regionProducts;
  const subLayoutFragments = box.subLayoutFragments?.map((fragment) => {
    const projection = fragment.subLayout;
    const ownership = projection.view.root.ownership;
    const projectionBucket = buckets.get(projection);
    const existingProducts = ownership.status === "resolved"
      ? ownership.regionProducts
      : undefined;
    const compiledProducts = projectionBucket === undefined
      ? undefined
      : toQuireRetainedRegionProductSet(projectionBucket);
    const rootProducts = mergeProjectionRegionProducts(
      existingProducts,
      compiledProducts
    );
    return {
      ...fragment,
      subLayout: {
        ...projection,
        view: {
          ...projection.view,
          root: {
            ...projection.view.root,
            ownership: ownership.status === "resolved" && rootProducts !== undefined
              ? { ...ownership, regionProducts: rootProducts }
              : ownership
          }
        }
      }
    };
  });

  if (!isLayoutContainer(box)) {
    return {
      ...box,
      ...(regionProducts === undefined ? {} : { regionProducts }),
      ...(subLayoutFragments === undefined ? {} : { subLayoutFragments })
    };
  }

  const container: QuireLayoutContainer = {
    ...box,
    ...(regionProducts === undefined ? {} : { regionProducts }),
    ...(subLayoutFragments === undefined ? {} : { subLayoutFragments }),
    children: box.children.map((child) =>
      rebuildLayoutWithProducts(child, buckets)
    )
  };

  return container;
}

/**
 * Merges nested child products with provider-declared products by identity.
 *
 * Child-flow products are compiled before the provider's own declarations are
 * installed. Both belong to the same projected owner, while retained rebuilds
 * may carry the previous provider compilation. Identity replacement keeps the
 * current geometry without duplicating roots, regions, or controls.
 *
 * @param existing - Products retained from the projected child flow.
 * @param compiled - Current provider declaration compilation.
 * @returns Complete owner-local products, or undefined when neither exists.
 */
function mergeProjectionRegionProducts(
  existing: QuireRetainedRegionProducts | undefined,
  compiled: QuireRetainedRegionProducts | undefined
): QuireRetainedRegionProducts | undefined {
  if (existing === undefined) return compiled;
  if (compiled === undefined) return existing;

  return {
    roots: mergeByIdentity(
      existing.roots,
      compiled.roots,
      (root) => root.id.value
    ),
    regions: mergeByIdentity(
      existing.regions,
      compiled.regions,
      (region) => createQuireLayoutProviderRegionKey(region.ref)
    ),
    hitTargets: mergeByIdentity(
      existing.hitTargets,
      compiled.hitTargets,
      (target) => target.id
    ),
    layerContributions: mergeByIdentity(
      existing.layerContributions,
      compiled.layerContributions,
      (contribution) => contribution.contributionId
    ),
    selectionPolicies: mergeByIdentity(
      existing.selectionPolicies,
      compiled.selectionPolicies,
      (policy) => `${createQuireLayoutProviderRegionKey(policy.region)}:${policy.policyId}`
    ),
    gaps: mergeByIdentity(
      existing.gaps,
      compiled.gaps,
      (gap) => [
        gap.code,
        gap.producerId,
        gap.sourceKind,
        gap.regionId,
        gap.targetId,
        gap.contributionId,
        gap.artifactId,
        gap.message
      ].join(":")
    )
  };
}

/**
 * Replaces previous retained records with the current record of the same id.
 *
 * @param existing - Previously retained records.
 * @param current - Current compilation records.
 * @param readIdentity - Stable identity reader for the record family.
 * @returns Deterministic records in first-seen order with current values.
 */
function mergeByIdentity<T>(
  existing: readonly T[],
  current: readonly T[],
  readIdentity: (value: T) => string
): readonly T[] {
  const values = new Map(existing.map((value) => [readIdentity(value), value]));
  for (const value of current) {
    values.set(readIdentity(value), value);
  }
  return [...values.values()];
}

/**
 * Requires an exact retained-product owner instead of assigning ambiguous data
 * to the provider root.
 *
 * @param owner - Explicit owner resolved from canonical retained identity.
 * @param description - Human-readable identity used by diagnostics.
 * @returns Exact retained-product owner.
 */
function readRequiredProductOwner(
  owner: QuireLayoutProviderProductOwner | undefined,
  description: string
): QuireLayoutProviderProductOwner {
  if (owner !== undefined) {
    return owner;
  }
  throw new RangeError(
    `Cannot install provider products: ${description} has no explicit layout owner.`
  );
}

/**
 * Reports whether one layout box owns recursive children.
 *
 * @param box - Layout box to inspect.
 * @returns Whether the box is a layout container.
 */
function isLayoutContainer(box: QuireLayoutBox): box is QuireLayoutContainer {
  return Array.isArray((box as Partial<QuireLayoutContainer>).children);
}
