import {
  collectQuireActivatedLayerCommandIds,
  collectQuireRuntimeLayerRealizationIds
} from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../../types";
import type { MountedRuntimeLayerReplacement } from "./types";

/**
 * Collects the runtime-activated artifacts a selection update replaces.
 *
 * Painted chrome was realized from the previous snapshot's contributions, so a supplied
 * snapshot that does not share them must not hide what is still on screen. Unread deferred
 * bodies contribute nothing: they were never painted.
 *
 * @param previous - Snapshot whose activation was last rendered.
 * @param current - Snapshot being rendered.
 * @returns Conditional product and overlay ids, and top-level overlay command ids, from both.
 */
export function collectMountedRuntimeLayerReplacement(
  previous: QuireViewRenderResult["layoutSnapshot"],
  current: QuireViewRenderResult["layoutSnapshot"]
): MountedRuntimeLayerReplacement {
  const prior = collectQuireRuntimeLayerRealizationIds(previous);
  const next = collectQuireRuntimeLayerRealizationIds(current);
  return {
    runtimeLayerRealizationIds: {
      productIds: new Set([...prior.productIds, ...next.productIds]),
      domOverlayIds: new Set([...prior.domOverlayIds, ...next.domOverlayIds])
    },
    replacedOverlayCommandIds: collectQuireActivatedLayerCommandIds(
      [...new Set([...previous.layerContributions ?? [], ...current.layerContributions ?? []])],
      "overlay"
    )
  };
}
