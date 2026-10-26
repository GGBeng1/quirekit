import { buildQuireOverlayDisplayList } from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../../types";
import {
  createQuireDisplayInvalidationProjection,
  createQuireRetainedDisplayOwnerChunkCollector,
  createQuireRetainedDisplayOwnerDiagnostics,
  createQuireRetainedDisplayOwnerIndex
} from "@quirekit/view-engine";
import { refreshQuirePageStackOverlayDisplayListChunks } from "../../page-stack";
import { replaceMountedSelectionOverlayCommands } from "../../selection-overlay";
import {
  buildQuireRenderInteractionSnapshot,
  createQuireActiveLayerViewTargets,
  createQuireActiveRuntimeLayerDomOverlays,
  createQuireDecorationCursorTargets
} from "@quirekit/view-engine";
import { readRenderOnlyDomOverlays } from "./dom-overlays";
import { collectMountedRuntimeLayerReplacement } from "./realization-ids";
import type { CreateMountedSelectionGeometryRenderResultOptions } from "./types";

/**
 * Builds a render-result patch from an already resolved selection geometry.
 *
 * @param options - Previous result, selection geometry, and overlay render inputs.
 * @returns Render result with updated selection geometry and overlay display list.
 */
export function createMountedSelectionGeometryRenderResult(
  options: CreateMountedSelectionGeometryRenderResultOptions
): QuireViewRenderResult {
  const previous = options.previousRenderResult;
  const layoutSnapshot = options.layoutSnapshot ?? previous.layoutSnapshot;
  const layoutDirtyRange = "layoutDirtyRange" in options
    ? options.layoutDirtyRange
    : previous.layoutDirtyRange;
  const updatePatch = "updatePatch" in options
    ? options.updatePatch
    : previous.updatePatch;
  const { runtimeLayerRealizationIds, replacedOverlayCommandIds } = collectMountedRuntimeLayerReplacement(
    previous.layoutSnapshot,
    layoutSnapshot
  );
  const activeRuntimeLayerDomOverlays = createQuireActiveRuntimeLayerDomOverlays(
    layoutSnapshot
  );
  const retainedRenderOnlyDomOverlays = readRenderOnlyDomOverlays(
    previous.domOverlays,
    layoutSnapshot.domOverlays,
    runtimeLayerRealizationIds.domOverlayIds
  );
  const renderTimeDomOverlays = [
    ...activeRuntimeLayerDomOverlays,
    ...retainedRenderOnlyDomOverlays
  ];
  // Persistent owner keys remain stable, but selection is itself a retained
  // overlay owner whose range, bounds, and page membership change on every
  // selection patch. Recompile the graph, then seed unchanged owner chunks by
  // exact key instead of retaining stale selection membership.
  const displayOwnerIndex = createQuireRetainedDisplayOwnerIndex({
    snapshot: layoutSnapshot,
    selectionGeometry: options.selectionGeometry,
    decorationLane: previous.decorationLane
  });
  const displayOwnerChunkCollector = createQuireRetainedDisplayOwnerChunkCollector(
    displayOwnerIndex
  );
  for (const owner of displayOwnerIndex.owners) {
    if (
      owner.kind === "selection"
      || (owner.kind === "layer-contribution"
        && runtimeLayerRealizationIds.productIds.has(owner.productId))
    ) {
      continue;
    }
    const previousChunk = previous.displayOwnerChunks.chunksByOwnerKey[owner.key];
    if (previousChunk === undefined) {
      continue;
    }
    for (const segment of previousChunk.segments) {
      displayOwnerChunkCollector.append({
        productId: owner.productId,
        paintScope: owner.paintScope,
        paintOrder: segment.paintOrder,
        commands: segment.commands
      });
    }
  }
  const displayInvalidation = createQuireDisplayInvalidationProjection({
    ownerIndex: displayOwnerIndex,
    ...(updatePatch === undefined ? {} : { updatePatch }),
    ...(layoutDirtyRange === undefined ? {} : { layoutDirtyRange })
  });
  const interactionSnapshot = buildQuireRenderInteractionSnapshot({
    layoutSnapshot,
    selectionGeometry: options.selectionGeometry,
    decorationLane: previous.decorationLane,
    domOverlays: renderTimeDomOverlays
  });
  const selectionOverlayDisplayList = buildQuireOverlayDisplayList({
    snapshot: layoutSnapshot,
    selectionGeometry: options.selectionGeometry,
    ownerCommandCollector: displayOwnerChunkCollector,
    ...(options.omitCaretCommands === true ? { omitCaretCommands: true } : {}),
    ...(options.displayListStyles === undefined
      ? {}
      : { styles: options.displayListStyles }),
    ...(options.surfaceConfig === undefined
      ? {}
      : { surfaceConfig: options.surfaceConfig })
  });
  const displayOwnerChunks = displayOwnerChunkCollector.finish(
    layoutSnapshot.documentRect
  );
  const displayOwnerDiagnostics = createQuireRetainedDisplayOwnerDiagnostics({
    ownerIndex: displayOwnerIndex,
    ownerChunkCount: displayOwnerChunks.chunks.length,
    invalidation: displayInvalidation,
    observerBridgeUses: 0
  });
  const pageChunksOwnCommands = previous.pageDisplayListChunks !== undefined &&
    previous.displayList.commands.length === 0;
  const overlayDisplayList = pageChunksOwnCommands
    ? {
        ...selectionOverlayDisplayList,
        commands: []
      }
    : {
        ...selectionOverlayDisplayList,
        commands: replaceMountedSelectionOverlayCommands(
          previous.overlayDisplayList.commands,
          selectionOverlayDisplayList.commands,
          replacedOverlayCommandIds
        )
      };

  return {
    ...previous,
    layoutSnapshot,
    interactionSnapshot,
    selectionContext: options.selectionContext,
    ...(layoutDirtyRange === undefined ? {} : { layoutDirtyRange }),
    ...(updatePatch === undefined ? {} : { updatePatch }),
    displayOwnerIndex,
    displayOwnerChunks,
    displayInvalidation,
    displayOwnerDiagnostics,
    selectionGeometry: options.selectionGeometry,
    domOverlays: [
      ...layoutSnapshot.domOverlays,
      ...renderTimeDomOverlays
    ],
    viewTargets: [
      ...createQuireActiveLayerViewTargets(layoutSnapshot),
      ...createQuireDecorationCursorTargets(previous.decorationLane),
      ...previous.decorationLane.widgets.map((widget) => widget.target)
    ],
    ...(options.rebuildCompositeDisplayList === true && !pageChunksOwnCommands
      ? {
          displayList: {
            ...previous.displayList,
            commands: [
              ...previous.contentDisplayList.commands,
              ...overlayDisplayList.commands
            ]
          }
        }
      : {}),
    overlayDisplayList,
    ...(options.refreshPageDisplayListChunks === true
      ? {
          pageDisplayListChunks: refreshQuirePageStackOverlayDisplayListChunks(
            previous.pageDisplayListChunks,
            selectionOverlayDisplayList,
            replacedOverlayCommandIds
          )
        }
      : {})
  };
}
