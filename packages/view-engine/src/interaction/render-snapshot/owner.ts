import type { QuireLayoutSnapshot } from "../../editor-layout";
import type { QuireInteractionSnapshotOwner } from "./types";

/**
 * Resolves retained owner facts for transient render products.
 *
 * @param snapshot - Base layout snapshot.
 * @returns Retained owner facts when the layout snapshot declares them.
 */
export function resolveQuireInteractionSnapshotOwner(
  snapshot: QuireLayoutSnapshot
): QuireInteractionSnapshotOwner {
  const owner = snapshot.root.layoutOwner;
  return owner === undefined
    ? {}
    : {
        viewRegion: owner.region,
        source: owner.source,
        capabilities: owner.capabilities
      };
}
