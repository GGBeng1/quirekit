import type { QuireRetainedRegionProductGap } from "../../declaration/types";
import type { QuireRetainedLayerContribution } from "../types";

/** Producer facts attached to layer validation gaps. */
export interface QuireLayerContributionValidationContext {
  /** Stable producer id, when valid. */
  readonly producerId?: string | undefined;
  /** Source kind, when valid. */
  readonly sourceKind?: string | undefined;
}

/**
 * Records missing or duplicate artifact identity.
 *
 * @param id - Candidate stable id.
 * @param seen - Producer-scoped identity set.
 * @param missingCode - Gap code used for blank identity.
 * @param duplicateCode - Gap code used for duplicate identity.
 * @param duplicateMessage - Duplicate diagnostic.
 * @param contribution - Exact owning contribution.
 * @param context - Producer facts attached to gaps.
 * @param gaps - Mutable canonical gap sink.
 */
export function recordQuireLayerContributionIdentity(
  id: string,
  seen: Set<string>,
  missingCode: QuireRetainedRegionProductGap["code"],
  duplicateCode: QuireRetainedRegionProductGap["code"],
  duplicateMessage: string,
  contribution: QuireRetainedLayerContribution,
  context: QuireLayerContributionValidationContext,
  gaps: QuireRetainedRegionProductGap[]
): void {
  if (id.trim().length === 0) {
    pushQuireLayerContributionValidationGap(
      missingCode,
      "Layer artifact must declare a non-blank stable id.",
      contribution,
      context,
      gaps
    );
    return;
  }
  if (seen.has(id)) {
    pushQuireLayerContributionValidationGap(
      duplicateCode,
      duplicateMessage,
      contribution,
      context,
      gaps,
      id
    );
    return;
  }
  seen.add(id);
}

/**
 * Appends one artifact validation gap.
 *
 * @param code - Stable gap code.
 * @param message - Human-readable diagnostic.
 * @param contribution - Exact owning contribution.
 * @param context - Producer facts attached to gaps.
 * @param gaps - Mutable canonical gap sink.
 * @param artifactId - Artifact id attached to diagnostics.
 */
export function pushQuireLayerContributionValidationGap(
  code: QuireRetainedRegionProductGap["code"],
  message: string,
  contribution: QuireRetainedLayerContribution,
  context: QuireLayerContributionValidationContext,
  gaps: QuireRetainedRegionProductGap[],
  artifactId?: string | undefined
): void {
  gaps.push({
    code,
    message,
    ...context,
    regionId: contribution.owner.region.regionId.value,
    contributionId: contribution.contributionId,
    ...(artifactId === undefined ? {} : { artifactId })
  });
}
