import type { QuireRect } from "@quirekit/renderer";
import { sliceQuireInlineTextRunsToRange } from "@quirekit/layout/inline";
import { sliceQuireInlineSourceProductsToRange } from "../../../inline/source-capability";
import type { QuireLayoutBox } from "../../../types";
import type { QuirePageBodyProjection } from "../types";
import type { ProjectedQuireFlowClipBoxOptions } from "./types";
import { projectQuireFlowClipBoxViewProducts } from "./products";

/**
 * Creates the projected box fields without opening lazy text-fragment getters.
 *
 * @param options - Source box plus projected id, range, and rectangle.
 * @returns Base layout box fields safe to spread into projected output.
 */
export function createProjectedLayoutBoxBase(
  options: ProjectedQuireFlowClipBoxOptions
): QuireLayoutBox {
  const viewProducts = projectQuireFlowClipBoxViewProducts(options);

  return {
    id: options.id,
    range: options.range,
    rect: options.rect,
    ...(options.box.inlineLayoutRect === undefined
      ? {}
      : {
          inlineLayoutRect: createProjectedInlineLayoutRect(
            options.box.inlineLayoutRect,
            options.projection,
            options.rect
          )
        }),
    ...(options.box.layoutSignature === undefined
      ? {}
      : { layoutSignature: options.box.layoutSignature }),
    ...(options.box.nodeHandle === undefined
      ? {}
      : { nodeHandle: options.box.nodeHandle }),
    ...(options.box.viewRoot === undefined
      ? {}
      : { viewRoot: options.box.viewRoot }),
    ...viewProducts,
    ...(options.box.layoutOwner === undefined || viewProducts.layoutOwner !== undefined
      ? {}
      : { layoutOwner: options.box.layoutOwner }),
    ...(options.box.viewCapabilities === undefined
      ? {}
      : { viewCapabilities: options.box.viewCapabilities }),
    ...(options.box.exportFallbacks === undefined
      ? {}
      : { exportFallbacks: options.box.exportFallbacks }),
    ...(options.box.table === undefined ? {} : { table: options.box.table }),
    ...(options.box.textRuns === undefined
      ? {}
      : {
          textRuns: sliceQuireInlineTextRunsToRange(
            options.box.textRuns,
            options.range
          )
        }),
    ...sliceQuireInlineSourceProductsToRange(options.box, options.range)
  };
}

/**
 * Projects the original inline wrapping rectangle through a parent flow clip.
 *
 * Parent table/cell projection may clip the visible box to a narrow fragment
 * band. IME preedit still needs the source wrapping width, but it must
 * use the projected visible y band so overlay geometry stays page-local.
 *
 * @param source - Source-flow inline layout rectangle.
 * @param projection - Page projection used for the visible box.
 * @param visibleRect - Projected visible rectangle for the box.
 * @returns Projected inline layout rectangle for transient reflow.
 */
function createProjectedInlineLayoutRect(
  source: QuireRect,
  projection: QuirePageBodyProjection,
  visibleRect: QuireRect
): QuireRect {
  return {
    x: source.x + projection.dx,
    y: visibleRect.y,
    width: source.width,
    height: visibleRect.height
  };
}
