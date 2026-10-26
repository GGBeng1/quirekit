import type { QuireHitTarget } from "../../../../layout";
import type { QuireLayoutSnapshot } from "../../../../editor-layout";
import type { QuireLayoutLayerTargetMap } from "./types";

const snapshotTargetMaps = new WeakMap<QuireLayoutSnapshot, QuireLayoutLayerTargetMap>();

/**
 * Reads the private target identity map of a published immutable snapshot.
 *
 * @param snapshot - Current geometry authority for the pointer query.
 * @returns Target lookup retained only while its owning snapshot is reachable.
 */
export function readQuireLayerTargetMap(
  snapshot: QuireLayoutSnapshot
): ReadonlyMap<string, QuireHitTarget> {
  const existing = snapshotTargetMaps.get(snapshot);
  if (existing !== undefined && existing.targets === snapshot.hitTargets) {
    return existing.byId;
  }

  // Geometry can change with the same PM document. Bind this derived lookup to
  // the published snapshot and target array, never to document or target ids.
  const byId = new Map(snapshot.hitTargets.map((target) => [target.id, target]));
  snapshotTargetMaps.set(snapshot, { targets: snapshot.hitTargets, byId });
  return byId;
}
