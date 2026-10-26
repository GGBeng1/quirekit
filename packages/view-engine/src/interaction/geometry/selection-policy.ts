import type { QuireLayoutRegionRef } from "@quirekit/layout/identity";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import type { QuireRetainedRegionSelectionPolicyKind } from "../../layout";

/**
 * Resolves the selection policy owned by one exact retained region occurrence.
 *
 * @param snapshot - Snapshot carrying compiled region selection policies.
 * @param region - Exact retained region represented by the geometry answer.
 * @returns Matching policy kind, or undefined when the region has no policy.
 */
export function resolveQuireRegionSelectionPolicy(
  snapshot: QuireLayoutSnapshot,
  region: QuireLayoutRegionRef | undefined
): QuireRetainedRegionSelectionPolicyKind | undefined {
  if (region === undefined) {
    return undefined;
  }

  return snapshot.regionSelectionPolicies?.find((policy) =>
    policy.region.rootId.value === region.rootId.value
    && policy.region.regionId.value === region.regionId.value
    && policy.region.visualInstanceId === region.visualInstanceId
  )?.kind;
}
