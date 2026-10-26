import type { QuireMountedObjectAnchorOccurrence } from "@quirekit/core";
import type { QuireInteractionSelectionTarget } from "@quirekit/view-engine";

/**
 * Chooses the occurrence used by mounted object-anchor resolution.
 *
 * Explicit caller identity always wins. Without it, the mounted View may reuse
 * only an exact object interaction target for the requested object. This keeps
 * repeated layout ambiguous when selection does not retain visual ownership.
 *
 * @param objectId - Stable object identity requested by the caller.
 * @param occurrence - Optional exact occurrence already owned by the caller.
 * @param interactionTarget - Current retained interaction target.
 * @returns Exact occurrence, or undefined when no safe inference exists.
 */
export function resolveMountedObjectAnchorOccurrence(
  objectId: string,
  occurrence: QuireMountedObjectAnchorOccurrence | undefined,
  interactionTarget: QuireInteractionSelectionTarget | null
): QuireMountedObjectAnchorOccurrence | undefined {
  if (occurrence !== undefined) return occurrence;
  const hit = interactionTarget?.interactionHit;
  if (hit?.kind !== "object" || hit.objectId !== objectId) return undefined;
  const visualInstanceId = hit.region.visualInstanceId;
  return visualInstanceId === undefined
    ? undefined
    : Object.freeze({ visualInstanceId });
}
