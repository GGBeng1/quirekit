import {
  rewriteQuireLayerContributionBody,
  type QuireRetainedRegionProducts
} from "../../../../region-products";
import type { QuireLayoutTranslation } from "../types";
import { translateQuireRect } from "./rect";
import {
  translateCompiledViewNode,
  translateQuireHitArea
} from "@quirekit/renderer";

/**
 * Translates retained region geometry with its owning layout box.
 *
 * Retained products are authoritative query geometry, not paint metadata. When
 * page projection moves a whole source-flow box, its document-space regions and
 * hit targets must move in the same operation or the view graph would contain a
 * second, stale geometry fact for the same retained address.
 *
 * @param products - Source-flow retained products attached to the box.
 * @param projection - Page-body projection applied to the owning box.
 * @returns Products with document-space geometry translated to page-stack space.
 */
export function translateQuireRetainedRegionProducts(
  products: QuireRetainedRegionProducts,
  projection: QuireLayoutTranslation
): QuireRetainedRegionProducts {
  return {
    roots: products.roots,
    regions: products.regions.map((region) =>
      region.rect === undefined || region.coordinateSpace !== "document"
        ? region
        : {
            ...region,
            rect: translateQuireRect(region.rect, projection)
          }
    ),
    hitTargets: products.hitTargets.map((target) =>
      target.queryOwner?.coordinateSpace !== undefined
        && target.queryOwner.coordinateSpace !== "document"
        ? target
        : {
            ...target,
            rect: translateQuireRect(target.rect, projection),
            ...(target.hitArea === undefined
              ? {}
              : {
                  hitArea: translateQuireHitArea(
                    target.hitArea,
                    projection.dx,
                    projection.dy
                  )
                })
        }
    ),
    layerContributions: products.layerContributions.map((contribution) => {
      if (contribution.coordinateSpace !== "document") {
        return contribution;
      }
      return rewriteQuireLayerContributionBody(contribution, {
        rect: translateCompiledViewNode(
          { rect: contribution.rect, commands: [], domOverlays: [] },
          projection.dx,
          projection.dy
        ).rect,
        ...(contribution.visualBounds === undefined
          ? {}
          : {
              visualBounds: translateQuireRect(
                contribution.visualBounds,
                projection
              )
            })
      }, (body) => {
        const translated = translateCompiledViewNode(
          { rect: contribution.rect, ...body },
          projection.dx,
          projection.dy
        );
        return {
          commands: translated.commands,
          domOverlays: translated.domOverlays,
          targets: translated.targets ?? []
        };
      });
    }),
    selectionPolicies: products.selectionPolicies,
    gaps: products.gaps
  };
}
