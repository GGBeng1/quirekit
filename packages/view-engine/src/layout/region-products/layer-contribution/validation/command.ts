import {
  readQuireDisplayCommandPaintBounds,
  type QuireDisplayCommand,
  type QuireDocumentRange
} from "@quirekit/renderer";
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
 * Validates one command tree against contribution geometry and exact source.
 *
 * @param command - Command tree to validate.
 * @param contribution - Exact owning contribution.
 * @param ownerRange - Exact owner source range, when present.
 * @param commandIds - Producer-scoped command identity index.
 * @param context - Producer facts attached to gaps.
 * @param gaps - Mutable canonical gap sink.
 */
export function validateQuireLayerContributionCommand(
  command: QuireDisplayCommand,
  contribution: QuireRetainedLayerContribution,
  ownerRange: QuireDocumentRange | undefined,
  commandIds: Set<string>,
  context: QuireLayerContributionValidationContext,
  gaps: QuireRetainedRegionProductGap[]
): void {
  recordQuireLayerContributionIdentity(
    command.id,
    commandIds,
    "missing-layer-command-id",
    "duplicate-layer-command-id",
    "Layer command id is duplicated within one retained producer.",
    contribution,
    context,
    gaps
  );
  if (
    ownerRange !== undefined
    && command.range !== undefined
    && !containsQuireLayerContributionRange(ownerRange, command.range)
  ) {
    pushQuireLayerContributionValidationGap(
      "layer-artifact-range-outside-owner",
      "Layer command range escapes its exact owner source.",
      contribution,
      context,
      gaps,
      command.id
    );
  }
  if (!containsQuireLayerContributionRect(
    contribution.visualBounds ?? contribution.rect,
    readQuireDisplayCommandPaintBounds(command)
  )) {
    pushQuireLayerContributionValidationGap(
      "layer-command-rect-outside-contribution",
      "Layer command geometry escapes its contribution.",
      contribution,
      context,
      gaps,
      command.id
    );
  }

  // Recurse through clip groups so nested identities, ranges, and paint bounds
  // are validated without treating legal clipping as invalid geometry.
  if (command.kind === "clip") {
    for (const child of command.commands) {
      validateQuireLayerContributionCommand(
        child,
        contribution,
        ownerRange,
        commandIds,
        context,
        gaps
      );
    }
  }
}
