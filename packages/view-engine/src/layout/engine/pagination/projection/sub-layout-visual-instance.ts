import type { QuireRect } from "@quirekit/renderer";
import type { QuireSubLayoutProjection } from "../../sub-layout";
import { projectQuireRetainedRegionProductsToVisualInstance } from "./split-box/visual-instance";
import type { QuireLayoutTranslation } from "./types";
import { projectQuireSubLayoutRetainedProductsToPage } from "./sub-layout-region-products";

/** Optional page facts used when a sub-layout is fragmented by pagination. */
export interface ProjectQuireSubLayoutProjectionVisualInstanceOptions {
  /** Source-flow interaction clip accepted by the concrete page. */
  readonly sourceClip: QuireRect;
  /** Translation from source flow into page-stack document coordinates. */
  readonly translation: QuireLayoutTranslation;
}

/**
 * Projects one retained nested-flow root into the concrete visual occurrence
 * owned by its sub-layout result.
 *
 * The provider compiles logical products once. Fragmentation owns only the
 * occurrence identity and geometry, so every backend consumes the same
 * page-local root products without recompiling provider declarations.
 *
 * @param projection - Sub-layout projection whose geometry id identifies the occurrence.
 * @param options - Optional source clip and translation for nested product projection.
 * @returns Projection with page-local retained identity and products.
 */
export function projectQuireSubLayoutProjectionVisualInstance(
  projection: QuireSubLayoutProjection,
  options?: ProjectQuireSubLayoutProjectionVisualInstanceOptions
): QuireSubLayoutProjection {
  const ownership = projection.view.root.ownership;
  if (ownership.status !== "resolved") {
    return projection;
  }

  const sourceRegion = ownership.owner.region;
  const visualInstanceId = projection.geometry.id;
  const viewRegion = {
    ...sourceRegion,
    visualInstanceId
  };
  const regionProducts = ownership.regionProducts === undefined
    ? undefined
    : options === undefined
      ? projectQuireRetainedRegionProductsToVisualInstance(
          ownership.regionProducts,
          sourceRegion,
          viewRegion,
          visualInstanceId,
          projection.geometry.interactionClip
        )
      : projectQuireSubLayoutRetainedProductsToPage({
          products: ownership.regionProducts,
          primaryRegion: sourceRegion,
          primaryPageRect: projection.geometry.interactionClip,
          sourceClip: options.sourceClip,
          translation: options.translation,
          visualInstanceId
        });

  return {
    ...projection,
    view: {
      ...projection.view,
      root: {
        ...projection.view.root,
        ownership: {
          ...ownership,
          owner: { ...ownership.owner, region: viewRegion },
          ...(regionProducts === undefined ? {} : { regionProducts })
        }
      }
    }
  };
}
