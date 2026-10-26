import { createEditor } from "@quirekit/core";
import { NodeSelection, TextSelection } from "@quirekit/pm";
import type {
  QuireDisplayCommand,
  QuireViewTarget
} from "@quirekit/renderer";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { retainQuireLayoutSnapshotForTest } from "@quirekit/view-engine/test-support/layout";
import type { QuireRetainedLayerContribution } from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../../types";
import {
  createQuireDisplayInvalidationProjection,
  createQuireRetainedDisplayOwnerChunkCollector,
  createQuireRetainedDisplayOwnerDiagnostics,
  createQuireRetainedDisplayOwnerIndex
} from "@quirekit/view-engine";
import {
  buildQuireRenderInteractionSnapshot,
  createQuireActiveRuntimeLayerDomOverlays
} from "@quirekit/view-engine";
import { createMountedSelectionGeometryRenderResult } from ".";

describe("selection-driven layer contribution activation", () => {
  it("removes and restores every runtime realization without recompiling the owner", () => {
    const editor = createEditor({
      extensions: [StarterKit],
      content: { type: "doc", content: [{ type: "paragraph" }] }
    });
    const contribution = createContribution(editor.state.doc.child(0).nodeSize);

    editor.dispatchTransaction(editor.state.pm.tr.setSelection(
      NodeSelection.create(editor.state.doc, 0)
    ));
    const selectedState = editor.state;
    editor.dispatchTransaction(editor.state.pm.tr.setSelection(
      TextSelection.create(editor.state.doc, 1)
    ));
    const textState = editor.state;

    const selectedSnapshot = createSnapshot(selectedState, contribution);
    const textSnapshot = createSnapshot(textState, contribution);
    const selectedResult = createActiveRenderResult(selectedSnapshot, contribution);
    const inactiveResult = createMountedSelectionGeometryRenderResult({
      previousRenderResult: selectedResult,
      layoutSnapshot: textSnapshot,
      selectionGeometry: { carets: [], ranges: [] },
      rebuildCompositeDisplayList: true
    });

    expect(inactiveResult.layoutSnapshot.layerContributions?.[0]).toBe(contribution);
    expect(inactiveResult.overlayDisplayList.commands).toEqual([]);
    expect(inactiveResult.domOverlays).toEqual([]);
    expect(inactiveResult.viewTargets).toEqual([]);
    expect(inactiveResult.interactionSnapshot.hitTargets.some(
      (target) => target.id.includes("fixture-controls")
    )).toBe(false);
    expect(readContributionCommands(inactiveResult, contribution)).toEqual([]);

    const reactivatedResult = createMountedSelectionGeometryRenderResult({
      previousRenderResult: inactiveResult,
      layoutSnapshot: selectedSnapshot,
      selectionGeometry: { carets: [], ranges: [] },
      rebuildCompositeDisplayList: true
    });

    expect(reactivatedResult.layoutSnapshot.layerContributions?.[0]).toBe(contribution);
    expect(reactivatedResult.overlayDisplayList.commands.map((command) => command.id))
      .toEqual(["fixture-handle"]);
    expect(reactivatedResult.domOverlays.map((overlay) => overlay.id))
      .toEqual(["fixture-overlay"]);
    expect(reactivatedResult.viewTargets.map((target) => target.id))
      .toEqual(["fixture-target"]);
    expect(reactivatedResult.interactionSnapshot.hitTargets.some(
      (target) => target.id.includes("fixture-controls")
    )).toBe(true);
    expect(readContributionCommands(reactivatedResult, contribution).map(
      (command) => command.id
    )).toEqual(["fixture-handle"]);
  });
});

/**
 * Creates a retained snapshot that preserves one canonical contribution.
 *
 * @param state - Editor state whose selection controls activation.
 * @param contribution - Stable provider product shared across snapshots.
 * @returns Retained snapshot suitable for selection-only projection.
 */
function createSnapshot(
  state: QuireViewRenderResult["layoutSnapshot"]["state"],
  contribution: QuireRetainedLayerContribution
): QuireViewRenderResult["layoutSnapshot"] {
  return retainQuireLayoutSnapshotForTest({
    state,
    documentRect: { x: 0, y: 0, width: 120, height: 80 },
    viewportRect: { x: 0, y: 0, width: 120, height: 80 },
    domOverlays: [],
    hitTargets: [],
    layerContributions: [contribution],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: contribution.range.to },
      rect: { x: 0, y: 0, width: 120, height: 80 },
      children: []
    }
  });
}

/**
 * Creates the active full-render baseline consumed by selection-only updates.
 *
 * @param layoutSnapshot - Selected-owner snapshot.
 * @param contribution - Active contribution to realize.
 * @returns Complete render result with command, overlay, and target products.
 */
function createActiveRenderResult(
  layoutSnapshot: QuireViewRenderResult["layoutSnapshot"],
  contribution: QuireRetainedLayerContribution
): QuireViewRenderResult {
  const displayOwnerIndex = createQuireRetainedDisplayOwnerIndex({
    snapshot: layoutSnapshot
  });
  const collector = createQuireRetainedDisplayOwnerChunkCollector(displayOwnerIndex);
  collector.append({
    productId: displayOwnerIndex.owners.find((owner) => owner.kind === "layer-contribution")!.productId,
    paintScope: "layer-overlay",
    paintOrder: 300,
    commands: contribution.commands
  });
  const displayOwnerChunks = collector.finish(layoutSnapshot.documentRect);
  const displayInvalidation = createQuireDisplayInvalidationProjection({
    ownerIndex: displayOwnerIndex
  });
  const emptyDisplayList = {
    bounds: layoutSnapshot.documentRect,
    commands: []
  };
  const domOverlays = createQuireActiveRuntimeLayerDomOverlays(layoutSnapshot);
  const decorationLane = {
    interactionTargets: [],
    backgrounds: [],
    textStyles: [],
    nodes: [],
    pointMarkers: [],
    widgets: [],
    diagnostics: []
  };

  return {
    layoutSnapshot,
    interactionSnapshot: buildQuireRenderInteractionSnapshot({
      layoutSnapshot,
      selectionGeometry: { carets: [], ranges: [] },
      decorationLane,
      domOverlays
    }),
    displayOwnerIndex,
    displayInvalidation,
    displayOwnerChunks,
    displayOwnerDiagnostics: createQuireRetainedDisplayOwnerDiagnostics({
      ownerIndex: displayOwnerIndex,
      ownerChunkCount: displayOwnerChunks.chunks.length,
      invalidation: displayInvalidation,
      observerBridgeUses: 0
    }),
    selectionGeometry: { carets: [], ranges: [] },
    decorationLane,
    displayList: {
      bounds: layoutSnapshot.documentRect,
      commands: contribution.commands
    },
    contentDisplayList: emptyDisplayList,
    overlayDisplayList: {
      bounds: layoutSnapshot.documentRect,
      commands: contribution.commands
    },
    domOverlays,
    viewTargets: contribution.targets
  };
}

/**
 * Reads direct commands retained for one canonical contribution.
 *
 * @param renderResult - Render result carrying direct owner chunks.
 * @param contribution - Contribution whose exact owner is requested.
 * @returns Overlay commands currently realized for the contribution.
 */
function readContributionCommands(
  renderResult: QuireViewRenderResult,
  contribution: QuireRetainedLayerContribution
): readonly QuireDisplayCommand[] {
  const owner = renderResult.displayOwnerIndex.owners.find(
    (candidate) => candidate.kind === "layer-contribution"
      && candidate.source.sourceId === contribution.owner.source.sourceId
  );
  return owner === undefined
    ? []
    : renderResult.displayOwnerChunks.chunksByOwnerKey[owner.key]
      ?.overlayDisplayList.commands ?? [];
}

/**
 * Creates one selected-owner contribution with all three runtime products.
 *
 * @param nodeSize - Exact selected node range size.
 * @returns Canonical conditional layer contribution.
 */
function createContribution(nodeSize: number): QuireRetainedLayerContribution {
  const range = { from: 0, to: nodeSize };
  const rect = { x: 10, y: 10, width: 80, height: 40 };
  const capabilities = {
    editable: true,
    selectable: true,
    focusable: true,
    copyable: true,
    commandable: true,
    accessible: true
  } as const;
  const target: QuireViewTarget = {
    id: "fixture-target",
    nodePath: "fixture/target",
    rect,
    range,
    role: "button",
    pointerEvents: "auto",
    events: {}
  };

  return {
    contributionId: "fixture-controls",
    owner: {
      root: {
        id: { value: "root:fixture" },
        kind: "block-container",
        source: { sourceId: "source:fixture", range },
        capabilities
      },
      region: {
        rootId: { value: "root:fixture" },
        regionId: { value: "region:fixture" },
        kind: "control"
      },
      source: { sourceId: "source:fixture", range },
      capabilities
    },
    range,
    rect,
    coordinateSpace: "document",
    layer: { plane: "controls" },
    paintSurface: "overlay",
    activation: { kind: "selected-owner" },
    commands: [{
      id: "fixture-handle",
      kind: "fill-rect",
      rect,
      fillStyle: "#2563eb",
      layer: "overlay"
    }],
    domOverlays: [{
      id: "fixture-overlay",
      range,
      rect,
      html: "<button>Resize</button>",
      pointerEvents: "auto"
    }],
    targets: [target]
  };
}
