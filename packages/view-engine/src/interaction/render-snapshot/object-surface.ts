import {
  refreshQuireLayoutSnapshotLayerTargetIndex
} from "../../layout/layer-targets";
import type { QuireRetainedLayoutSnapshot } from "../../editor-layout";
import type { QuireHitTarget } from "../../layout/engine/types";
import { isQuireNestedStorySelectionActive } from "./nested-story-state";

/**
 * Builds the persistent-target base used by one render-time interaction pass.
 *
 * A selected floating object keeps its controls contribution active while its
 * nested story owns selection. During that state the persistent full-object
 * target must yield to drawing-text caret geometry; edge and handle targets are
 * appended separately and remain interactive.
 *
 * Objects anchored in a header/footer story stay paint-only until that story
 * owns selection, so page-band drawings such as watermarks never mask body text.
 *
 * @param snapshot - Retained layout snapshot carrying persistent owner targets.
 * @returns Snapshot whose active stories are not masked by inactive owner surfaces.
 */
export function createQuireInteractionBaseSnapshot(
  snapshot: QuireRetainedLayoutSnapshot
): QuireRetainedLayoutSnapshot {
  const suppressedOwnerKeys = collectNestedStoryEditingOwnerKeys(snapshot);

  const hitTargets = snapshot.hitTargets.filter((target) =>
    !isSuppressedOwnerObjectTarget(target, suppressedOwnerKeys)
    && !isInactivePageBandStoryTarget(target, snapshot)
  );
  if (hitTargets.length === snapshot.hitTargets.length) {
    return snapshot;
  }

  return refreshQuireLayoutSnapshotLayerTargetIndex({
    ...snapshot,
    hitTargets
  });
}

/**
 * Collects object owners whose related nested story currently owns selection.
 *
 * @param snapshot - Snapshot carrying editor state and conditional contributions.
 * @returns Stable owner keys for object surfaces that must yield to story hits.
 */
function collectNestedStoryEditingOwnerKeys(
  snapshot: QuireRetainedLayoutSnapshot
): ReadonlySet<string> {
  const contributions = snapshot.layerContributions ?? [];
  if (contributions.length === 0) {
    return new Set();
  }
  const selection = snapshot.state.pm.selection;

  return new Set(contributions.flatMap((contribution) =>
    isQuireNestedStorySelectionActive(
      contribution,
      selection.from,
      selection.to
    )
      ? [createOwnerKey(
          contribution.owner.region.rootId.value,
          contribution.owner.region.regionId.value,
          contribution.owner.region.visualInstanceId,
          contribution.owner.source.sourceId
        )]
      : []
  ));
}

/**
 * Checks whether a persistent target is the full object surface for one owner.
 *
 * @param target - Persistent hit target emitted by layout.
 * @param suppressedOwnerKeys - Active object owners whose stories need caret hits.
 * @returns Whether this target must be omitted from the interaction snapshot.
 */
function isSuppressedOwnerObjectTarget(
  target: QuireHitTarget,
  suppressedOwnerKeys: ReadonlySet<string>
): boolean {
  if (target.interactionHit?.kind !== "object") {
    return false;
  }
  const region = target.interactionHit.region ?? target.viewRegion;
  const source = target.interactionHit.source ?? target.source;
  if (region === undefined || source === undefined) {
    return false;
  }

  return suppressedOwnerKeys.has(createOwnerKey(
    region.rootId.value,
    region.regionId.value,
    region.visualInstanceId,
    source.sourceId
  ));
}

/**
 * Checks whether a target is scoped to a header/footer story outside editing.
 *
 * @param target - Persistent hit target emitted by layout.
 * @param snapshot - Snapshot carrying the current editor selection.
 * @returns Whether the target belongs to a page-band story that does not own selection.
 */
function isInactivePageBandStoryTarget(
  target: QuireHitTarget,
  snapshot: QuireRetainedLayoutSnapshot
): boolean {
  const scope = target.interactionScope;
  if (scope?.region.kind !== "header" && scope?.region.kind !== "footer") {
    return false;
  }
  const range = scope.source.range;
  const selection = snapshot.state.pm.selection;
  return range === undefined
    || selection.from < range.from
    || selection.to > range.to;
}

/**
 * Creates one exact retained owner identity for render-time target filtering.
 *
 * @param rootId - Retained root identity.
 * @param regionId - Retained region identity.
 * @param visualInstanceId - Optional repeated visual occurrence identity.
 * @param sourceId - Persisted source identity.
 * @returns Stable compound owner key.
 */
function createOwnerKey(
  rootId: string,
  regionId: string,
  visualInstanceId: string | undefined,
  sourceId: string
): string {
  return `${rootId}\u0000${regionId}\u0000${visualInstanceId ?? ""}\u0000${sourceId}`;
}
