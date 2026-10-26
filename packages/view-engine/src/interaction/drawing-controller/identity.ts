import type { QuireDrawingControllerIdentity } from "./types";

/**
 * Reports whether two controller identities address the same source occurrence.
 *
 * @param first - First identity.
 * @param second - Second identity.
 * @returns Whether every source, region, occurrence, and revision field matches.
 */
export function isSameQuireDrawingControllerIdentity(
  first: QuireDrawingControllerIdentity,
  second: QuireDrawingControllerIdentity
): boolean {
  return first.objectId === second.objectId
    && first.drawingId === second.drawingId
    && first.rootId === second.rootId
    && first.regionId === second.regionId
    && first.visualInstanceId === second.visualInstanceId
    && first.sourceRevision === second.sourceRevision;
}
