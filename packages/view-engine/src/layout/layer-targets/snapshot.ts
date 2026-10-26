import {
  createQuireViewLayerTargetIndex,
  normalizeQuireViewInteractionHitLayerFacts,
  resolveQuireViewLayerTargetFacts,
  type QuireViewLayerTargetIndex
} from "../../view-graph";
import type {
  QuireLayoutPage,
  QuireLayoutProductSnapshot
} from "../types";
import type { QuireHitTarget } from "../engine/types";

/**
 * Normalizes retained hit target layer and pointer policy facts.
 *
 * @param target - Hit target to expose in a mounted interaction snapshot.
 * @returns Hit target with explicit retained layer and pointer policy facts.
 */
export function normalizeQuireLayoutHitTargetLayerFacts(
  target: QuireHitTarget
): QuireHitTarget {
  const facts = resolveQuireViewLayerTargetFacts(target);

  return {
    ...target,
    layer: facts.layer,
    pointerPolicy: facts.pointerPolicy,
    ...(target.interactionHit === undefined
      ? {}
      : {
          interactionHit: normalizeQuireViewInteractionHitLayerFacts(
            target.interactionHit,
            facts
          )
        })
  };
}

/**
 * Creates the retained layer target index for mounted interaction hit testing.
 *
 * @param hitTargets - Normalized retained hit targets.
 * @param pages - Snapshot page metadata used as coarse buckets.
 * @param viewportRect - Snapshot viewport used as a coarse bucket when unpaginated.
 * @returns Layer target index, or undefined when there are no retained targets.
 */
export function createQuireLayoutLayerTargetIndex(
  hitTargets: readonly QuireHitTarget[],
  pages: readonly QuireLayoutPage[] = [],
  viewportRect?: QuireLayoutProductSnapshot["viewportRect"] | undefined
): QuireViewLayerTargetIndex | undefined {
  if (hitTargets.length === 0) {
    return undefined;
  }

  // The index is a pure function of its inputs; one frame refreshes it for the same targets
  // several times, so an unchanged target list, page list and viewport reuse the built index.
  const cached = builtIndexes.get(hitTargets);
  if (cached !== undefined && sameIndexBuckets(cached, pages, viewportRect)) {
    return cached.index;
  }
  const index = createQuireViewLayerTargetIndex({
    targets: hitTargets.map((target) => ({
      targetId: target.id,
      rect: target.rect
    })),
    pages: pages.map((page) => ({
      pageIndex: page.pageIndex,
      rect: page.pageRect
    })),
    viewports: pages.length > 0 || viewportRect === undefined
      ? []
      : [
          {
            viewportId: "snapshot",
            rect: viewportRect
          }
        ]
  });
  builtIndexes.set(hitTargets, { pages, viewportRect, index });
  return index;
}

/** Index inputs and result, keyed by the target list it was built from. */
interface QuireBuiltLayerTargetIndex {
  /** Page list used as buckets. */
  readonly pages: readonly QuireLayoutPage[];
  /** Viewport used as the bucket of an unpaginated snapshot. */
  readonly viewportRect: QuireLayoutProductSnapshot["viewportRect"] | undefined;
  /** Built index. */
  readonly index: QuireViewLayerTargetIndex;
}

/** Built indexes; target lists are immutable, so a list never needs a different index for equal buckets. */
const builtIndexes = new WeakMap<readonly QuireHitTarget[], QuireBuiltLayerTargetIndex>();

/**
 * Reports whether an index was built with the same buckets.
 *
 * @param built - Previously built index and its inputs.
 * @param pages - Requested page buckets.
 * @param viewportRect - Requested viewport bucket, used only without pages.
 * @returns Whether reusing the built index gives an identical result.
 */
function sameIndexBuckets(
  built: QuireBuiltLayerTargetIndex,
  pages: readonly QuireLayoutPage[],
  viewportRect: QuireLayoutProductSnapshot["viewportRect"] | undefined
): boolean {
  if (built.pages !== pages && (built.pages.length > 0 || pages.length > 0)) return false;
  if (pages.length > 0) return true;
  const previous = built.viewportRect;
  return previous === viewportRect || (previous !== undefined && viewportRect !== undefined
    && previous.x === viewportRect.x && previous.y === viewportRect.y
    && previous.width === viewportRect.width && previous.height === viewportRect.height);
}

/**
 * Refreshes the retained layer target index on a layout snapshot.
 *
 * @param snapshot - Snapshot whose hit targets should be indexed.
 * @param pages - Page metadata used as coarse buckets.
 * @returns Snapshot with a refreshed index, or with stale index data removed.
 */
export function refreshQuireLayoutSnapshotLayerTargetIndex<
  Snapshot extends QuireLayoutProductSnapshot
>(
  snapshot: Snapshot,
  pages: readonly QuireLayoutPage[] = snapshot.pages ?? []
): Snapshot {
  const layerTargetIndex = createQuireLayoutLayerTargetIndex(
    snapshot.hitTargets,
    pages,
    snapshot.viewportRect
  );

  return (layerTargetIndex === undefined
    ? withoutQuireLayoutLayerTargetIndex(snapshot)
    : {
        ...snapshot,
        layerTargetIndex
      }) as Snapshot;
}

/**
 * Adds retained layer targets to a layout snapshot and refreshes its index.
 *
 * @param snapshot - Snapshot to extend for interaction queries.
 * @param hitTargets - Additional retained targets to append.
 * @returns Snapshot with merged hit targets and a refreshed layer target index.
 */
export function extendQuireLayoutSnapshotLayerTargets<
  Snapshot extends QuireLayoutProductSnapshot
>(
  snapshot: Snapshot,
  hitTargets: readonly QuireHitTarget[]
): Snapshot {
  if (hitTargets.length === 0) {
    return snapshot;
  }

  const mergedHitTargets = [
    ...snapshot.hitTargets,
    ...hitTargets.map(normalizeQuireLayoutHitTargetLayerFacts)
  ];
  const nextSnapshot = {
    ...snapshot,
    hitTargets: mergedHitTargets
  };

  return refreshQuireLayoutSnapshotLayerTargetIndex(nextSnapshot);
}

/**
 * Removes a stale layer target index from a copied snapshot.
 *
 * @param snapshot - Snapshot copy that may still carry an index.
 * @returns Snapshot without a layer target index.
 */
function withoutQuireLayoutLayerTargetIndex(
  snapshot: QuireLayoutProductSnapshot
): QuireLayoutProductSnapshot {
  const { layerTargetIndex: _layerTargetIndex, ...rest } = snapshot;

  return rest;
}
