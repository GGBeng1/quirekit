import type { QuireLayoutBox } from "../../../types";
import { projectQuireSubLayoutRetainedProductsToPage } from "../sub-layout-region-products";
import type { ProjectedQuireFlowClipBoxOptions } from "./types";
import { resolveQuireProjectionOccurrence } from "../occurrence";

/**
 * Preserves independently owned products while clipping a source box to a page.
 *
 * @param options - Accepted box geometry and the parent-owned source clip.
 * @returns Page-qualified ownership and retained products, when present.
 */
export function projectQuireFlowClipBoxViewProducts(
  options: ProjectedQuireFlowClipBoxOptions
): Pick<QuireLayoutBox, "viewRegion" | "regionProducts" | "layoutOwner"> {
  const { box, projection } = options;
  const visualInstanceId = `page:${resolveQuireProjectionOccurrence(projection)}:${options.id}`;
  const viewRegion = box.viewRegion === undefined
    ? undefined
    : { ...box.viewRegion, visualInstanceId };
  const layoutOwner = box.layoutOwner;
  const ownsPrimary = viewRegion !== undefined && layoutOwner !== undefined
    && layoutOwner.region.rootId.value === viewRegion.rootId.value
    && layoutOwner.region.regionId.value === viewRegion.regionId.value;
  const ownership = {
    ...(viewRegion === undefined ? {} : { viewRegion }),
    ...(ownsPrimary ? { layoutOwner: { ...layoutOwner, region: viewRegion } } : {})
  };
  if (box.regionProducts === undefined) return ownership;

  // The parent clip, not the text box, owns hanging marker visibility. Keep
  // source clipping separate from translation so partial regions do not move.
  const parent = options.rectClip ?? {
    ...projection.page.pageRect,
    x: projection.page.pageRect.x - projection.dx,
    y: projection.page.pageRect.y - projection.dy
  };
  const top = Math.max(parent.y, options.flowClip.top);
  const bottom = Math.min(parent.y + parent.height, options.flowClip.bottom);
  return {
    ...ownership,
    regionProducts: projectQuireSubLayoutRetainedProductsToPage({
      products: box.regionProducts,
      primaryRegion: box.viewRegion,
      primaryPageRect: options.rect,
      sourceClip: { ...parent, y: top, height: Math.max(0, bottom - top) },
      sourceFlowClip: options.flowClip,
      retainPartialText: options.retainPartialText,
      translation: projection,
      visualInstanceId
    })
  };
}
