import type { QuireRect } from "@quirekit/renderer";
import type { QuireRetainedRegionProductGap } from "../../declaration/types";
import type { QuireRetainedLayerContribution } from "../types";
import {
  containsQuireLayerContributionRange,
  containsQuireLayerContributionRect
} from "../geometry";
import { validateQuireLayerContributionArtifacts } from "./artifacts";
import { validateQuireLayerContributionCommand } from "./command";
import type { QuireLayerContributionValidationState } from "./state";
import {
  pushQuireLayerContributionValidationGap,
  recordQuireLayerContributionIdentity,
  type QuireLayerContributionValidationContext
} from "./gap";

/**
 * Validates one complete candidate against exact owner and artifact invariants.
 *
 * @param contribution - Complete canonical candidate to validate.
 * @param state - Producer-scoped duplicate-id indexes.
 * @param ownerRect - Exact owner region rectangle, when available.
 * @param context - Producer facts attached to gaps.
 * @param gaps - Mutable canonical gap sink.
 * @returns Whether the contribution contains no validation gap.
 */
export function validateQuireRetainedLayerContribution(
  contribution: QuireRetainedLayerContribution,
  state: QuireLayerContributionValidationState,
  ownerRect: QuireRect | undefined,
  context: QuireLayerContributionValidationContext,
  gaps: QuireRetainedRegionProductGap[]
): boolean {
  const initialGapCount = gaps.length;
  validateQuireRetainedLayerContributionHeader(contribution, state, ownerRect, context, gaps);
  validateQuireRetainedLayerContributionBody(contribution, state, context, gaps);
  return gaps.length === initialGapCount;
}

/**
 * Validates identity, owner range and geometry, which never require the artifacts.
 *
 * @param contribution - Candidate whose header is validated; its artifacts are not read.
 * @param state - Producer-scoped duplicate-id indexes.
 * @param ownerRect - Exact owner region rectangle, when available.
 * @param context - Producer facts attached to gaps.
 * @param gaps - Mutable canonical gap sink.
 * @returns Whether the header contains no validation gap.
 */
export function validateQuireRetainedLayerContributionHeader(
  contribution: QuireRetainedLayerContribution,
  state: QuireLayerContributionValidationState,
  ownerRect: QuireRect | undefined,
  context: QuireLayerContributionValidationContext,
  gaps: QuireRetainedRegionProductGap[]
): boolean {
  const initialGapCount = gaps.length;
  const ownerRange = contribution.owner.source.range;

  recordQuireLayerContributionIdentity(
    contribution.contributionId,
    state.contributionIds,
    "missing-layer-contribution-id",
    "duplicate-layer-contribution-id",
    "Layer contribution id is duplicated within one retained producer.",
    contribution,
    context,
    gaps
  );
  if (ownerRange === undefined) {
    pushQuireLayerContributionValidationGap(
      "missing-layer-contribution-owner-range",
      "Layer contribution owner must declare a source range.",
      contribution,
      context,
      gaps
    );
  } else if (!containsQuireLayerContributionRange(ownerRange, contribution.range)) {
    pushQuireLayerContributionValidationGap(
      "layer-contribution-range-outside-owner",
      "Layer contribution range escapes its exact owner source.",
      contribution,
      context,
      gaps
    );
  }
  if (ownerRect === undefined) {
    pushQuireLayerContributionValidationGap(
      "missing-layer-contribution-owner-rect",
      "Layer contribution owner must declare document geometry.",
      contribution,
      context,
      gaps
    );
  } else if (!containsQuireLayerContributionRect(ownerRect, contribution.rect)) {
    pushQuireLayerContributionValidationGap(
      "layer-contribution-rect-outside-owner",
      "Layer contribution rectangle escapes its exact owner region.",
      contribution,
      context,
      gaps
    );
  }
  if (contribution.visualBounds !== undefined) {
    if (!containsQuireLayerContributionRect(
      contribution.visualBounds,
      contribution.rect
    )) {
      pushQuireLayerContributionValidationGap(
        "invalid-layer-contribution-visual-bounds",
        "Visual bounds must be finite and contain the contribution rectangle.",
        contribution,
        context,
        gaps
      );
    }
  }

  return gaps.length === initialGapCount;
}

/**
 * Validates paint commands, overlays and targets against the owner and producer-wide ids.
 *
 * Runs after the header is accepted: eagerly for ordinary contributions, and on first read
 * for a deferred one.
 *
 * @param contribution - Candidate with an accepted header and its artifacts.
 * @param state - Producer-scoped duplicate-id indexes.
 * @param context - Producer facts attached to gaps.
 * @param gaps - Mutable canonical gap sink.
 * @returns Whether the artifacts contain no validation gap.
 */
export function validateQuireRetainedLayerContributionBody(
  contribution: QuireRetainedLayerContribution,
  state: QuireLayerContributionValidationState,
  context: QuireLayerContributionValidationContext,
  gaps: QuireRetainedRegionProductGap[]
): boolean {
  const initialGapCount = gaps.length;
  const ownerRange = contribution.owner.source.range;
  for (const command of contribution.commands) {
    validateQuireLayerContributionCommand(
      command,
      contribution,
      ownerRange,
      state.commandIds,
      context,
      gaps
    );
  }
  validateQuireLayerContributionArtifacts(
    contribution,
    ownerRange,
    state.overlayIds,
    state.targetIds,
    context,
    gaps
  );

  return gaps.length === initialGapCount;
}
