import type { QuireRetainedRegionProducts } from "../../../region-products";
import type { QuireInlinePlacementGap } from "../placement-reference";
import type { QuireHitArea, QuireRect } from "@quirekit/renderer";

/** Page-local coarse and exact geometry for one anchored object target. */
export interface QuireInlineInteractionTargetGeometry {
  /** Page-clipped coarse bounds, or null when the occurrence is not visible. */
  readonly rect: QuireRect | null;
  /** Optional exact geometry retained after coarse filtering. */
  readonly hitArea?: QuireHitArea | undefined;
}

/** Canonical retained products and typed placement failures for inline sources. */
export interface QuireInlineRetainedProductCompilation {
  /** Complete retained products compiled from resolved visual occurrences. */
  readonly products: QuireRetainedRegionProducts;
  /** Placement failures that excluded whole occurrence products. */
  readonly placementGaps: readonly QuireInlinePlacementGap[];
}
