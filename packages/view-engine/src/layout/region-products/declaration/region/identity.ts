import type {
  QuireRetainedRegionRegionDeclaration,
  QuireRetainedRegionProductGap
} from "../types";
import type { QuireRetainedRegionCompilationContext } from "../shared";

/**
 * Validates that a parent region id points at a declared same-root region.
 *
 * @param region - Region declaration to validate.
 * @param allRegions - All declared regions, used for parent lookup.
 * @param context - Producer identity facts used in diagnostics.
 * @param gaps - Mutable production gap list.
 * @param regionId - Non-empty region id being validated.
 */
export function validateQuireRetainedRegionRegionParentFact(
  region: QuireRetainedRegionRegionDeclaration,
  allRegions: readonly QuireRetainedRegionRegionDeclaration[],
  context: QuireRetainedRegionCompilationContext,
  gaps: QuireRetainedRegionProductGap[],
  regionId: string
): void {
  if (
    region.parentRegionId === undefined
    || allRegions.some((candidate) =>
      candidate.regionId === region.parentRegionId
    )
  ) {
    return;
  }

  gaps.push({
    code: "missing-parent-region",
    message: `Retained region "${regionId}" references missing parent region "${region.parentRegionId}".`,
    producerId: context.producerId,
    sourceKind: context.sourceKind,
    regionId
  });
}

/**
 * Validates duplicate region identities when the caller requests it.
 *
 * @param region - Region declaration to validate.
 * @param seenRegionKeys - Mutable set used to detect duplicate region identities.
 * @param context - Producer identity facts used in diagnostics.
 * @param gaps - Mutable production gap list.
 * @param regionId - Non-empty region id being validated.
 * @param recordDuplicateRegions - Whether duplicate diagnostics should be emitted.
 */
export function validateQuireRetainedRegionDuplicateRegionFact(
  region: QuireRetainedRegionRegionDeclaration,
  seenRegionKeys: Set<string>,
  context: QuireRetainedRegionCompilationContext,
  gaps: QuireRetainedRegionProductGap[],
  regionId: string,
  recordDuplicateRegions: boolean
): void {
  if (!recordDuplicateRegions) {
    return;
  }

  const regionKey = `${regionId}:${region.visualInstance?.visualInstanceId ?? ""}`;

  if (seenRegionKeys.has(regionKey)) {
    gaps.push({
      code: "duplicate-region",
      message: `Retained region "${regionId}" is duplicated for the same visual instance.`,
      producerId: context.producerId,
      sourceKind: context.sourceKind,
      regionId
    });
    return;
  }

  seenRegionKeys.add(regionKey);
}
