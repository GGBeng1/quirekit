import { matchesQuireLogicalRegion, matchesQuireRegionOccurrence } from "../../../../owner-facts/region";
import type { QuireLayoutBox } from "../../../types";
import type { QuireRetainedRegionProducts } from "../../../../region-products";
import type {
  QuireLayoutRegionRef
} from "@quirekit/layout/identity";
import type { QuireLayoutTranslation } from "../types";
import { projectPrimaryHitTarget } from "./hit-target";
import { projectQuireLayerContributionToPage } from "./layer-contribution";

/**
 * Derives page-local retained identity for one fragmented layout box.
 *
 * Pagination creates repeated visual occurrences after provider execution. The
 * projection layer therefore owns the concrete visual-instance id and rewrites
 * the primary region products together; copying a single-instance region across
 * pages would create multiple geometries for one retained address.
 *
 * @param box - Source-flow layout box before page fragmentation.
 * @param pageIndex - Page occurrence key that owns the projected occurrence.
 * @param rect - Page-local bounds of the projected occurrence.
 * @param visualInstanceId - Optional occurrence identity supplied by a repeated-story authority.
 * @returns Page-local view-region and retained-product fields.
 */
export function projectQuireLayoutBoxViewProductsToPage(
  box: QuireLayoutBox,
  pageIndex: number | string,
  rect: QuireLayoutBox["rect"],
  visualInstanceId = `page:${pageIndex}:${box.id}`
): Pick<QuireLayoutBox, "viewRegion" | "regionProducts" | "layoutOwner"> {
  const sourceRegion = box.viewRegion;
  if (sourceRegion === undefined) {
    return {};
  }

  const viewRegion = {
    ...sourceRegion,
    visualInstanceId
  };

  return {
    viewRegion,
    ...(box.layoutOwner === undefined
      ? {}
      : {
          layoutOwner: matchesQuireLogicalRegion(
            box.layoutOwner.region,
            sourceRegion
          )
            ? { ...box.layoutOwner, region: viewRegion }
            : box.layoutOwner
        }),
    ...(box.regionProducts === undefined
      ? {}
      : {
          regionProducts: projectQuireRetainedRegionProductsToVisualInstance(
            box.regionProducts,
            sourceRegion,
            viewRegion,
            visualInstanceId,
            rect
          )
        })
  };
}

/**
 * Rewrites products owned by a fragmented box's primary region.
 *
 * @param products - Source-flow retained products.
 * @param sourceRegion - Logical primary region before fragmentation.
 * @param pageRegion - Concrete page-local region reference.
 * @param visualInstanceId - Stable id of the page-local occurrence.
 * @param rect - Page-local primary region bounds.
 * @param translation - Explicit source-to-page translation when clipping changes the origin.
 * @returns Retained products whose primary ownership is page-local.
 */
export function projectQuireRetainedRegionProductsToVisualInstance(
  products: QuireRetainedRegionProducts,
  sourceRegion: QuireLayoutRegionRef,
  pageRegion: QuireLayoutRegionRef,
  visualInstanceId: string,
  rect: QuireLayoutBox["rect"],
  translation?: QuireLayoutTranslation
): QuireRetainedRegionProducts {
  const sourceRect = products.regions.find((region) =>
    matchesQuireRegionOccurrence(region.ref, sourceRegion)
  )?.rect;
  return {
    roots: products.roots,
    regions: products.regions.map((region) => {
      if (!matchesQuireLogicalRegion(region.ref, sourceRegion)) return region;
      const anchorOffset = region.rect === undefined || translation === undefined
        ? 0 : region.rect.y + translation.dy - rect.y;
      return {
        ...region, ref: pageRegion, rect,
        ...(region.textLine === undefined ? {} : {
          textLine: {
            topOffset: region.textLine.topOffset + anchorOffset,
            baselineOffset: region.textLine.baselineOffset + anchorOffset
          }
        })
      };
    }),
    hitTargets: products.hitTargets.flatMap((target) => {
      const projected = projectPrimaryHitTarget(
        target,
        sourceRegion,
        pageRegion,
        visualInstanceId,
        sourceRect,
        rect,
        translation
      );
      return projected === null ? [] : [projected];
    }),
    layerContributions: products.layerContributions.flatMap((contribution) => {
      if (!matchesQuireRegionOccurrence(contribution.owner.region, sourceRegion)) {
        return [contribution];
      }
      const projected = projectQuireLayerContributionToPage(
        contribution,
        pageRegion,
        visualInstanceId,
        sourceRect,
        rect,
        translation
      );
      return projected === null ? [] : [projected];
    }),
    selectionPolicies: products.selectionPolicies.map((policy) =>
      matchesQuireLogicalRegion(policy.region, sourceRegion)
        ? {
            ...policy,
            policyId: `${policy.policyId}:${visualInstanceId}`,
            region: pageRegion
          }
        : policy
    ),
    gaps: products.gaps
  };
}
