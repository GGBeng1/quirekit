import {
  mergeQuireRetainedRegionProductSets,
  type QuireRetainedRegionProducts
} from "../../../../region-products";
import type { QuireSubLayoutProjection } from "../../../sub-layout";
import type { QuireLayoutBox } from "../../../types";
import { isQuireLayoutContainer } from "../guards";
import { projectQuireSubLayoutRetainedProductsToPage } from "../sub-layout-region-products";
import type { ProjectQuireSubLayoutProjectionVisualInstanceOptions } from "../sub-layout-visual-instance";

/**
 * Promotes cell descendants into the occurrence that owns their snapshot output.
 *
 * @param projection - Cell occurrence with its root products already projected.
 * @param children - Accepted cell wrappers whose descendants provide retained products.
 * @param sourceProjection - Translation needed only for repeated-header source products.
 * @returns Projection with one outlet for root and descendant products.
 */
export function retainQuireTableCellDescendantProducts(
  projection: QuireSubLayoutProjection,
  children: readonly QuireLayoutBox[],
  sourceProjection?: ProjectQuireSubLayoutProjectionVisualInstanceOptions
): QuireSubLayoutProjection {
  const ownership = projection.view.root.ownership;
  if (ownership.status !== "resolved") return projection;

  // Cell wrappers and the projection root share ownership. Collect below those
  // wrappers: source-geometry adaptation deliberately does not emit products.
  const nested = mergeQuireRetainedRegionProductSets(children.flatMap((child) =>
    isQuireLayoutContainer(child) ? child.children.map(collectProducts) : []
  ));
  if (nested === undefined) return projection;
  const products = sourceProjection === undefined ? nested
    : projectQuireSubLayoutRetainedProductsToPage({
        products: nested,
        primaryPageRect: projection.geometry.interactionClip,
        visualInstanceId: projection.geometry.id,
        ...sourceProjection
      });
  return {
    ...projection,
    view: {
      ...projection.view,
      root: {
        ...projection.view.root,
        ownership: {
          ...ownership,
          regionProducts: mergeQuireRetainedRegionProductSets([
            ownership.regionProducts, products
          ])!
        }
      }
    }
  };
}

/**
 * Collects already accepted retained products in source-tree order.
 *
 * @param box - Descendant whose geometry and products share the same placement.
 * @returns Products owned by this descendant subtree, when present.
 */
function collectProducts(box: QuireLayoutBox): QuireRetainedRegionProducts | undefined {
  return mergeQuireRetainedRegionProductSets([
    box.regionProducts,
    ...(isQuireLayoutContainer(box) ? box.children.map(collectProducts) : [])
  ]);
}
