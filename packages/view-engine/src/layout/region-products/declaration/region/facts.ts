import type {
  QuireRetainedRegionRegionDeclaration,
  QuireRetainedRegionProductGap
} from "../types";
import type { QuireRetainedRegionCompilationContext } from "../shared";
import { isBlankQuireRetainedRegionTextFact } from "../shared";
import {
  validateQuireRetainedRegionDuplicateRegionFact,
  validateQuireRetainedRegionRegionParentFact
} from "./identity";

/**
 * Validates required facts on one region declaration.
 *
 * @param region - Region declaration to validate.
 * @param allRegions - All declared regions, used for parent lookup.
 * @param seenRegionKeys - Mutable set used to detect duplicate region identities.
 * @param context - Producer identity facts used in diagnostics.
 * @param gaps - Mutable production gap list.
 * @param recordDuplicateRegions - Whether this validation pass should record duplicate regions.
 */
export function validateQuireRetainedRegionRegionFacts(
  region: QuireRetainedRegionRegionDeclaration,
  allRegions: readonly QuireRetainedRegionRegionDeclaration[],
  seenRegionKeys: Set<string>,
  context: QuireRetainedRegionCompilationContext,
  gaps: QuireRetainedRegionProductGap[],
  recordDuplicateRegions: boolean
): void {
  const regionId = region.regionId;

  if (regionId === undefined || regionId.length === 0) {
    gaps.push({
      code: "missing-region-id",
      message: "Retained region must declare a stable region id.",
      producerId: context.producerId,
      sourceKind: context.sourceKind
    });
    return;
  }

  validateQuireRetainedRegionRegionKind(region, context, gaps, regionId);
  validateQuireRetainedRegionRegionSource(region, context, gaps, regionId);
  validateQuireRetainedRegionRegionCapabilities(region, context, gaps, regionId);
  validateQuireRetainedRegionRegionVisualInstance(region, context, gaps, regionId);
  validateQuireRetainedRegionRegionParentFact(region, allRegions, context, gaps, regionId);
  validateQuireRetainedRegionDuplicateRegionFact(
    region,
    seenRegionKeys,
    context,
    gaps,
    regionId,
    recordDuplicateRegions
  );
}

/**
 * Validates that a region has an explicit kind.
 *
 * @param region - Region declaration to validate.
 * @param context - Producer identity facts used in diagnostics.
 * @param gaps - Mutable production gap list.
 * @param regionId - Non-empty region id being validated.
 */
function validateQuireRetainedRegionRegionKind(
  region: QuireRetainedRegionRegionDeclaration,
  context: QuireRetainedRegionCompilationContext,
  gaps: QuireRetainedRegionProductGap[],
  regionId: string
): void {
  if (region.kind !== undefined) {
    return;
  }

  gaps.push({
    code: "missing-region-kind",
    message: "Retained region must declare a region kind.",
    producerId: context.producerId,
    sourceKind: context.sourceKind,
    regionId
  });
}

/**
 * Validates that a region has source identity.
 *
 * @param region - Region declaration to validate.
 * @param context - Producer identity facts used in diagnostics.
 * @param gaps - Mutable production gap list.
 * @param regionId - Non-empty region id being validated.
 */
function validateQuireRetainedRegionRegionSource(
  region: QuireRetainedRegionRegionDeclaration,
  context: QuireRetainedRegionCompilationContext,
  gaps: QuireRetainedRegionProductGap[],
  regionId: string
): void {
  if (region.source !== undefined && region.source.sourceId.length > 0) {
    return;
  }

  gaps.push({
    code: "missing-region-source",
    message: "Retained region must declare source identity.",
    producerId: context.producerId,
    sourceKind: context.sourceKind,
    regionId
  });
}

/**
 * Validates that a region declares capabilities.
 *
 * @param region - Region declaration to validate.
 * @param context - Producer identity facts used in diagnostics.
 * @param gaps - Mutable production gap list.
 * @param regionId - Non-empty region id being validated.
 */
function validateQuireRetainedRegionRegionCapabilities(
  region: QuireRetainedRegionRegionDeclaration,
  context: QuireRetainedRegionCompilationContext,
  gaps: QuireRetainedRegionProductGap[],
  regionId: string
): void {
  if (region.capabilities !== undefined) {
    return;
  }

  gaps.push({
    code: "missing-region-capabilities",
    message: "Retained region must declare capabilities.",
    producerId: context.producerId,
    sourceKind: context.sourceKind,
    regionId
  });
}

/**
 * Validates repeated visual-instance declarations.
 *
 * @param region - Region declaration to validate.
 * @param context - Producer identity facts used in diagnostics.
 * @param gaps - Mutable production gap list.
 * @param regionId - Non-empty region id being validated.
 */
function validateQuireRetainedRegionRegionVisualInstance(
  region: QuireRetainedRegionRegionDeclaration,
  context: QuireRetainedRegionCompilationContext,
  gaps: QuireRetainedRegionProductGap[],
  regionId: string
): void {
  if (
    region.visualInstance?.kind !== "repeated"
    || !isBlankQuireRetainedRegionTextFact(region.visualInstance.visualInstanceId)
  ) {
    return;
  }

  gaps.push({
    code: "missing-visual-instance",
    message: "Repeated retained region must declare a visual instance id.",
    producerId: context.producerId,
    sourceKind: context.sourceKind,
    regionId
  });
}
