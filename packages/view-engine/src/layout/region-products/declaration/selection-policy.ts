import type {
  QuireLayoutRegion
} from "@quirekit/layout/identity";
import type {
  QuireRetainedRegionSelectionPolicy,
  QuireRetainedRegionProductDeclaration,
  QuireRetainedRegionProductGap
} from "./types";
import type { QuireRetainedRegionCompilationContext } from "./shared";

/**
 * Compiles selection policies from producer declarations.
 *
 * @param declaration - Producer declaration being compiled.
 * @param regionById - Retained regions keyed by region id.
 * @param context - Producer identity facts used in diagnostics.
 * @param gaps - Mutable production gap list.
 * @returns Selection policies whose region ownership is valid.
 */
export function compileQuireRetainedRegionSelectionPolicies(
  declaration: QuireRetainedRegionProductDeclaration,
  regionById: ReadonlyMap<string, QuireLayoutRegion>,
  context: QuireRetainedRegionCompilationContext,
  gaps: QuireRetainedRegionProductGap[]
): readonly QuireRetainedRegionSelectionPolicy[] {
  return (declaration.selectionPolicies ?? []).flatMap((policy) => {
    const region = regionById.get(policy.regionId);

    if (region === undefined) {
      gaps.push({
        code: "missing-selection-policy-region",
        message: "Retained-region selection policy must reference a compiled retained region.",
        producerId: context.producerId,
        sourceKind: context.sourceKind,
        regionId: policy.regionId
      });
      return [];
    }

    return [
      {
        policyId: policy.policyId,
        region: region.ref,
        kind: policy.kind
      }
    ];
  });
}
