import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireRetainedRegionProductGap } from "../../declaration/types";
import type { QuireRetainedLayerContribution } from "../types";
import {
  containsQuireLayerContributionRange,
  containsQuireLayerContributionRect
} from "../geometry";
import {
  pushQuireLayerContributionValidationGap,
  recordQuireLayerContributionIdentity,
  type QuireLayerContributionValidationContext
} from "./gap";

/**
 * Validates DOM overlays and interaction targets against exact ownership.
 *
 * @param contribution - Exact owning contribution.
 * @param ownerRange - Exact owner source range, when present.
 * @param overlayIds - Producer-scoped overlay identity index.
 * @param targetIds - Producer-scoped target identity index.
 * @param context - Producer facts attached to gaps.
 * @param gaps - Mutable canonical gap sink.
 */
export function validateQuireLayerContributionArtifacts(
  contribution: QuireRetainedLayerContribution,
  ownerRange: QuireDocumentRange | undefined,
  overlayIds: Set<string>,
  targetIds: Set<string>,
  context: QuireLayerContributionValidationContext,
  gaps: QuireRetainedRegionProductGap[]
): void {
  for (const overlay of contribution.domOverlays) {
    recordQuireLayerContributionIdentity(
      overlay.id,
      overlayIds,
      "missing-layer-overlay-id",
      "duplicate-layer-overlay-id",
      "Layer overlay id is duplicated within one retained producer.",
      contribution,
      context,
      gaps
    );
    validateArtifactRange(overlay.range, ownerRange, overlay.id, contribution, context, gaps);
    if (!containsQuireLayerContributionRect(
      contribution.visualBounds ?? contribution.rect,
      overlay.rect
    )) {
      pushQuireLayerContributionValidationGap(
        "layer-overlay-rect-outside-contribution",
        "Layer overlay rectangle escapes its contribution.",
        contribution,
        context,
        gaps,
        overlay.id
      );
    }
  }

  for (const target of contribution.targets) {
    recordQuireLayerContributionIdentity(
      target.id,
      targetIds,
      "missing-layer-target-id",
      "duplicate-layer-target-id",
      "Layer target id is duplicated within one retained producer.",
      contribution,
      context,
      gaps
    );
    validateArtifactRange(target.range, ownerRange, target.id, contribution, context, gaps);
    if (!containsQuireLayerContributionRect(
      contribution.visualBounds ?? contribution.rect,
      target.rect
    )) {
      pushQuireLayerContributionValidationGap(
        "layer-target-rect-outside-contribution",
        "Layer target rectangle escapes its contribution.",
        contribution,
        context,
        gaps,
        target.id
      );
    }
  }
}

/**
 * Validates one optional artifact range against the exact owner source.
 *
 * @param range - Optional artifact range.
 * @param ownerRange - Exact owner source range, when present.
 * @param artifactId - Stable artifact id used by diagnostics.
 * @param contribution - Exact owning contribution.
 * @param context - Producer facts attached to gaps.
 * @param gaps - Mutable canonical gap sink.
 */
function validateArtifactRange(
  range: QuireDocumentRange | undefined,
  ownerRange: QuireDocumentRange | undefined,
  artifactId: string,
  contribution: QuireRetainedLayerContribution,
  context: QuireLayerContributionValidationContext,
  gaps: QuireRetainedRegionProductGap[]
): void {
  if (
    range !== undefined
    && ownerRange !== undefined
    && !containsQuireLayerContributionRange(ownerRange, range)
  ) {
    pushQuireLayerContributionValidationGap(
      "layer-artifact-range-outside-owner",
      "Layer artifact range escapes its exact owner source.",
      contribution,
      context,
      gaps,
      artifactId
    );
  }
}
