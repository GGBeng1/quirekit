import type {
  QuireLayoutRegionAddress,
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import type {
  QuireRetainedRegionRegionDeclaration,
  QuireRetainedRegionProductGap
} from "../types";
import type { QuireRetainedRegionCompilationContext } from "../shared";

/**
 * Resolves a parent region reference from a same-root parent id.
 *
 * @param region - Region whose parent should be resolved.
 * @param root - Root that owns the region.
 * @param allRegions - All declared same-root regions.
 * @param context - Producer identity facts used in diagnostics.
 * @param gaps - Mutable production gap list.
 * @returns Parent address, undefined for no parent, or null when missing.
 */
export function resolveQuireRetainedRegionParentRegionAddress(
  region: QuireRetainedRegionRegionDeclaration,
  root: QuireLayoutRoot,
  allRegions: readonly QuireRetainedRegionRegionDeclaration[],
  context: QuireRetainedRegionCompilationContext,
  gaps: QuireRetainedRegionProductGap[]
): QuireLayoutRegionAddress | undefined | null {
  if (region.parentRegionId === undefined) {
    return undefined;
  }

  const parent = allRegions.find((candidate) =>
    candidate.regionId === region.parentRegionId
  );

  if (parent === undefined) {
    gaps.push({
      code: "missing-parent-region",
      message: `Retained region "${region.regionId ?? ""}" references missing parent region "${region.parentRegionId}".`,
      producerId: context.producerId,
      sourceKind: context.sourceKind,
      regionId: region.regionId
    });
    return null;
  }

  return {
    rootId: root.id,
    regionId: { value: region.parentRegionId },
    ...(parent.visualInstance?.visualInstanceId === undefined
      ? {}
      : { visualInstanceId: parent.visualInstance.visualInstanceId })
  };
}
