import type {
  QuireRetainedRegionProductGap,
  QuireRetainedRegionProductGapCode
} from "../declaration/types";
import type {
  QuireLayerContributionCompilationContext,
  QuireRetainedLayerContributionDeclaration
} from "./types";

/**
 * Reads a non-empty identity fact.
 *
 * @param value - Candidate identity text.
 * @returns Trimmed identity text, or undefined when missing.
 */
export function readQuireLayerContributionText(value: string | undefined): string | undefined {
  const valueText = value?.trim();
  return valueText === undefined || valueText.length === 0 ? undefined : valueText;
}

/**
 * Appends one layer-contribution production gap.
 *
 * @param code - Stable gap code.
 * @param message - Human-readable diagnostic.
 * @param declaration - Rejected declaration.
 * @param context - Producer facts attached to the gap.
 * @param gaps - Mutable canonical gap sink.
 */
export function pushQuireLayerContributionDeclarationGap(
  code: QuireRetainedRegionProductGapCode,
  message: string,
  declaration: QuireRetainedLayerContributionDeclaration,
  context: QuireLayerContributionCompilationContext,
  gaps: QuireRetainedRegionProductGap[]
): void {
  gaps.push({
    code,
    message,
    ...context,
    ...(declaration.regionId === undefined ? {} : { regionId: declaration.regionId }),
    ...(declaration.contributionId === undefined
      ? {}
      : { contributionId: declaration.contributionId })
  });
}
