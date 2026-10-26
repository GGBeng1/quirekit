import type { QuireViewTarget } from "@quirekit/renderer";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import { filterQuireActiveLayerContributions } from "../../editor-layout";
import type { QuireLayoutDomOverlay } from "../../layout";
import type { QuireRetainedLayerContribution } from "../../layout/region-products";
import { isQuireLayerContributionBodyPending } from "../../layout/region-products/layer-contribution/deferred";
import { resolveQuireLayerContributionProductId } from "../../layout/region-products/layer-contribution/identity";

/**
 * Reads active contributions whose realization depends on runtime state.
 *
 * @param snapshot - Current retained layout snapshot and editor state.
 * @returns Active conditional contributions in canonical provider order.
 */
export function readQuireActiveRuntimeLayerContributions(
  snapshot: QuireLayoutSnapshot
): readonly QuireRetainedLayerContribution[] {
  return filterQuireActiveLayerContributions(
    snapshot.layerContributions ?? [],
    snapshot.state
  ).filter((contribution) => contribution.activation !== undefined);
}

/**
 * Resolves DOM overlays from currently active conditional contributions.
 *
 * Provider overlays may omit their range because the surrounding contribution
 * already owns one exact source range. Runtime projection materializes that
 * range before overlays enter mounted or interaction consumers.
 *
 * @param snapshot - Current retained layout snapshot and editor state.
 * @returns Active conditional DOM overlays with concrete document ranges.
 */
export function createQuireActiveRuntimeLayerDomOverlays(
  snapshot: QuireLayoutSnapshot
): readonly QuireLayoutDomOverlay[] {
  return readQuireActiveRuntimeLayerContributions(snapshot).flatMap(
    (contribution) => contribution.domOverlays.map((overlay) => ({
      ...overlay,
      range: overlay.range ?? contribution.range
    }))
  );
}

/**
 * Resolves neutral view targets from all contributions active in this state.
 *
 * @param snapshot - Current retained layout snapshot and editor state.
 * @returns Persistent and conditional view targets active for this render.
 */
export function createQuireActiveLayerViewTargets(
  snapshot: QuireLayoutSnapshot
): readonly QuireViewTarget[] {
  return filterQuireActiveLayerContributions(
    snapshot.layerContributions ?? [],
    snapshot.state
  ).flatMap((contribution) => contribution.targets);
}

/**
 * Collects every conditional contribution and overlay id in a stable snapshot.
 *
 * Selection-only updates use these ids to remove the prior activation's
 * realization before projecting the current one. Overlay ids come only from realized bodies:
 * an unread deferred body never mounted an overlay.
 *
 * @param snapshot - Stable retained snapshot carrying provider contributions.
 * @returns Conditional product and DOM overlay identity sets.
 */
export function collectQuireRuntimeLayerRealizationIds(
  snapshot: QuireLayoutSnapshot
): {
  /** Display product ids of activated contributions whose owner chunks must be rebuilt. */
  readonly productIds: ReadonlySet<string>;
  /** Stable DOM overlay ids whose previous realization must be discarded. */
  readonly domOverlayIds: ReadonlySet<string>;
} {
  const contributions = (snapshot.layerContributions ?? []).filter(
    (contribution) => contribution.activation !== undefined
  );

  return {
    productIds: new Set(contributions.map(resolveQuireLayerContributionProductId)),
    domOverlayIds: new Set(contributions
      .filter((contribution) => !isQuireLayerContributionBodyPending(contribution))
      .flatMap((contribution) => contribution.domOverlays.map((overlay) => overlay.id)))
  };
}
