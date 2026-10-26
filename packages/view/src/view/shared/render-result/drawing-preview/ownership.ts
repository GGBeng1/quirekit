import type {
  QuireDrawingControllerIdentity,
  QuireRetainedLayerContribution
} from "@quirekit/view-engine";

/**
 * Finds one drawing contribution owned by the exact retained visual occurrence.
 *
 * @param contributions - Current retained contribution graph.
 * @param identity - Captured drawing identity.
 * @param paintSurface - Paint authority to match.
 * @param activationKind - Optional runtime activation that must match.
 * @returns Exact contribution, or undefined when the retained owner is stale.
 */
export function findMountedDrawingContribution(
  contributions: readonly QuireRetainedLayerContribution[] | undefined,
  identity: QuireDrawingControllerIdentity,
  paintSurface: QuireRetainedLayerContribution["paintSurface"],
  activationKind?: "selected-owner"
): QuireRetainedLayerContribution | undefined {
  return contributions?.find((contribution) =>
    contribution.paintSurface === paintSurface
    && contribution.activation?.kind === activationKind
    && contribution.owner.root.id.value === identity.rootId
    && contribution.owner.region.regionId.value === identity.regionId
    && (contribution.owner.region.visualInstanceId ?? "single")
      === identity.visualInstanceId
  );
}
