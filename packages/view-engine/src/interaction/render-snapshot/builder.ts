import type { QuireRetainedLayoutSnapshot } from "../../editor-layout";
import { extendQuireLayoutSnapshotLayerTargets } from "../../layout/layer-targets";
import type { BuildQuireRenderInteractionSnapshotOptions } from "./types";
import { createQuireActiveNestedStorySurfaceTargets } from "./active-story-surface";
import {
  createQuireActivatedLayerContributionTargets,
  createQuireDecorationLayerTargets,
  createQuireDecorationWidgetLayerTargets,
  createQuireRenderDomOverlayLayerTargets,
  createQuireSelectionLayerTargets
} from "./targets";
import { resolveQuireInteractionSnapshotOwner } from "./owner";
import { createQuireInteractionBaseSnapshot } from "./object-surface";

/**
 * Builds a layout-compatible snapshot for interaction hit testing.
 *
 * The returned snapshot preserves the original layout tree but appends retained
 * layer targets for transient overlays and eventful render products. Paint and
 * export consumers keep using the original layout snapshot.
 *
 * @param options - Layout snapshot plus render-time interaction products.
 * @returns Snapshot whose hit targets include transient layer targets.
 */
export function buildQuireRenderInteractionSnapshot(
  options: BuildQuireRenderInteractionSnapshotOptions
): QuireRetainedLayoutSnapshot {
  const baseSnapshot = createQuireInteractionBaseSnapshot(
    options.layoutSnapshot
  );
  const owner = resolveQuireInteractionSnapshotOwner(options.layoutSnapshot);
  const targets = [
    ...createQuireActiveNestedStorySurfaceTargets(options.layoutSnapshot),
    ...createQuireActivatedLayerContributionTargets(options.layoutSnapshot),
    ...createQuireSelectionLayerTargets(options.selectionGeometry, owner),
    ...createQuireDecorationLayerTargets(options.decorationLane, owner),
    ...createQuireDecorationWidgetLayerTargets(options.decorationLane, owner),
    ...createQuireRenderDomOverlayLayerTargets(options.domOverlays ?? [], owner)
  ];

  return extendQuireLayoutSnapshotLayerTargets(
    baseSnapshot,
    targets
  );
}
