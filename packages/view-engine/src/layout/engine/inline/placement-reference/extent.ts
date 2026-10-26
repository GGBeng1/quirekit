import type { QuireInlineSourceExtent } from "@quirekit/layout/inline";

/**
 * Validates a visual frame independently of its paint and interaction overflow.
 * A line can occupy one zero-sized axis; the source model owns restrictions on
 * area-bearing objects, while this layer only validates placement geometry.
 * @param extent - Requested CSS-pixel frame and optional text baseline.
 * @returns Whether the frame can be placed without inventing a dimension.
 */
export function isValidInlineVisualExtent(extent: QuireInlineSourceExtent): boolean {
  const { inlineSize, blockSize, baselineOffset } = extent;
  return Number.isFinite(inlineSize) && Number.isFinite(blockSize)
    && inlineSize >= 0 && blockSize >= 0
    && (inlineSize > 0 || blockSize > 0)
    && (baselineOffset === undefined
      || (Number.isFinite(baselineOffset) && baselineOffset >= 0 && baselineOffset <= blockSize));
}
