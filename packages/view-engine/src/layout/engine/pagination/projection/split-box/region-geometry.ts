import { intersectQuireRects } from "@quirekit/renderer";
import type { QuireRetainedRegion } from "../../../../region-products";
import type {
  ProjectQuireSubLayoutRetainedProductsToPageOptions,
  QuireRetainedRegionPageGeometry
} from "../types";
import { translateQuireRect } from "../translate";

/**
 * Accepts a retained region using its geometry or explicit owning text line.
 *
 * @param region - Retained region in source-flow coordinates.
 * @param options - Parent clip, accepted baseline band and page translation.
 * @returns Visible geometry and exact translation, or null when not accepted.
 */
export function projectQuireNestedRegionGeometry(
  region: QuireRetainedRegion,
  options: ProjectQuireSubLayoutRetainedProductsToPageOptions
): QuireRetainedRegionPageGeometry | null {
  if (region.rect === undefined || region.coordinateSpace !== "document") return null;
  let translation = options.translation;
  if (region.textLine !== undefined && options.retainPartialText !== true) {
    // Controls follow the same half-open baseline ownership as their text.
    // Rectangle clipping alone would retain a ghost hit area on the next page.
    const band = options.sourceFlowClip ?? {
      top: options.sourceClip.y,
      bottom: options.sourceClip.y + options.sourceClip.height
    };
    const baseline = region.rect.y + region.textLine.baselineOffset;
    if (baseline < band.top || baseline >= band.bottom) return null;
    const lineTop = region.rect.y + region.textLine.topOffset;
    translation = {
      dx: translation.dx,
      dy: translation.dy + Math.max(0, band.top - lineTop)
    };
  }

  // The parent's clip does not rebase with the line. Both geometry and paint
  // consume this explicit translation instead of inferring it from clipped bounds.
  const rect = intersectQuireRects(
    translateQuireRect(region.rect, translation),
    translateQuireRect(options.sourceClip, options.translation)
  );
  return rect === null ? null : { rect, translation };
}
